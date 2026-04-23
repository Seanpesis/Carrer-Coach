import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { chatRatelimit } from "@/lib/ratelimit";
import { CAREER_COACH_SYSTEM_PROMPT, buildRAGPrompt } from "@/lib/prompts";

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

  // Resolve Clerk userId → internal UUID
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

  // RAG: embed query and retrieve resume chunks, fall back to raw_text
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

  // If Pinecone returned nothing, use raw_text (truncated to avoid token limits)
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

  let stream: Awaited<ReturnType<typeof client.messages.stream>>;
  try {
    stream = await client.messages.stream({
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
    return new Response(`Claude API error: ${err instanceof Error ? err.message : err}`, { status: 500 });
  }

  let fullResponse = "";
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text;
            fullResponse += text;
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
      } catch (err) {
        controller.enqueue(
          new TextEncoder().encode(`\n\n[Stream error: ${err instanceof Error ? err.message : err}]`)
        );
      } finally {
        controller.close();
        if (fullResponse) {
          await supabaseAdmin.from("chat_messages").insert({
            application_id: applicationId,
            role: "assistant",
            content: fullResponse,
          });
        }
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
