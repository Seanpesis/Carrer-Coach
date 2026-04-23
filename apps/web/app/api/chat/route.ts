import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { chatRatelimit } from "@/lib/ratelimit";
import { CAREER_COACH_SYSTEM_PROMPT, buildRAGPrompt } from "@/lib/prompts";

export const runtime = "edge";

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  applicationId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { success } = await chatRatelimit.limit(userId);
  if (!success) return new Response("Rate limit exceeded", { status: 429 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    return new Response("Invalid request", { status: 400 });

  const { message, applicationId } = parsed.data;

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!dbUser) return new Response("User not found", { status: 404 });

  const { data: application } = await supabaseAdmin
    .from("job_applications")
    .select("job_description, resumes(pinecone_namespace, raw_text)")
    .eq("id", applicationId)
    .eq("user_id", dbUser.id)
    .single();

  if (!application) return new Response("Application not found", { status: 404 });

  const { data: history } = await supabaseAdmin
    .from("chat_messages")
    .select("role, content")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const resumeData = application.resumes as { pinecone_namespace?: string; raw_text?: string } | null;
  const namespace = resumeData?.pinecone_namespace;
  const rawText = resumeData?.raw_text ?? "";
  let resumeChunks = "";

  if (namespace) {
    try {
      const { embedQuery } = await import("@/lib/openai");
      const { queryResumeChunks } = await import("@/lib/pinecone");
      const queryEmbedding = await embedQuery(message);
      resumeChunks = await queryResumeChunks(queryEmbedding, namespace);
    } catch {
      // fall through to raw_text
    }
  }

  if (!resumeChunks && rawText) {
    resumeChunks = rawText.slice(0, 6000);
  }

  const ragPrompt = buildRAGPrompt(
    application.job_description ?? "",
    resumeChunks,
    message
  );

  await supabaseAdmin.from("chat_messages").insert({
    application_id: applicationId,
    role: "user",
    content: message,
  });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let anthropicStream: ReturnType<typeof client.messages.stream>;
  try {
    anthropicStream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: CAREER_COACH_SYSTEM_PROMPT,
      messages: [
        ...(history ?? []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: ragPrompt },
      ],
    });
  } catch (err) {
    return new Response(
      `Claude API error: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    start(controller) {
      anthropicStream.on("text", (text) => {
        fullResponse += text;
        controller.enqueue(encoder.encode(text));
      });

      anthropicStream.on("error", (err) => {
        console.error("[chat] Anthropic stream error:", err);
        controller.enqueue(
          encoder.encode(`\n\n[Stream error: ${err.message}]`)
        );
        controller.close();
      });

      anthropicStream.on("finalMessage", () => {
        controller.close();
        if (fullResponse) {
          supabaseAdmin.from("chat_messages").insert({
            application_id: applicationId,
            role: "assistant",
            content: fullResponse,
          });
        }
      });
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
