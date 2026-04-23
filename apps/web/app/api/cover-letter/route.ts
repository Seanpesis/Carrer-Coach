import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "edge";

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  applicationId: z.string().uuid(),
});

const COVER_LETTER_PROMPT = `You are an expert cover letter writer. You write compelling, specific, and concise cover letters.

You will be given:
- The job description the user is targeting
- Relevant sections from their resume
- Any additional instructions from the user

Rules:
- Write in first person, professional but warm tone
- 3-4 paragraphs max (opening, relevant experience, why this company, closing)
- Reference specific details from both the resume and job description
- Never use generic filler phrases like "I am writing to express my interest"
- Lead with your strongest relevant qualification
- End with a confident, specific call to action
- Format as ready-to-send text`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const { message, applicationId } = parsed.data;

  const { data: dbUser } = await supabaseAdmin
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!dbUser) return new Response("User not found", { status: 404 });

  const { data: application } = await supabaseAdmin
    .from("job_applications")
    .select("job_description, resumes(pinecone_namespace, raw_text)")
    .eq("id", applicationId)
    .eq("user_id", dbUser.id)
    .single();

  if (!application) return new Response("Application not found", { status: 404 });

  const resumeData = application.resumes as { pinecone_namespace?: string; raw_text?: string } | null;
  const rawText = resumeData?.raw_text ?? "";
  let resumeContext = rawText.slice(0, 4000);

  if (resumeData?.pinecone_namespace) {
    try {
      const { embedQuery } = await import("@/lib/openai");
      const { queryResumeChunks } = await import("@/lib/pinecone");
      const embedding = await embedQuery(message);
      const chunks = await queryResumeChunks(embedding, resumeData.pinecone_namespace, 8);
      if (chunks) resumeContext = chunks;
    } catch { /* use raw_text fallback */ }
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let anthropicStream: ReturnType<typeof client.messages.stream>;
  try {
    anthropicStream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: COVER_LETTER_PROMPT,
      messages: [
        {
          role: "user",
          content: `--- JOB DESCRIPTION ---\n${application.job_description}\n\n--- MY RESUME ---\n${resumeContext}\n\n--- INSTRUCTIONS ---\n${message}`,
        },
      ],
    });
  } catch (err) {
    return new Response(
      `Claude API error: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    start(controller) {
      anthropicStream.on("text", (text) => {
        controller.enqueue(encoder.encode(text));
      });
      anthropicStream.on("error", (err) => {
        console.error("[cover-letter] Anthropic stream error:", err);
        controller.enqueue(encoder.encode(`\n\n[Stream error: ${err.message}]`));
        controller.close();
      });
      anthropicStream.on("finalMessage", () => {
        controller.close();
      });
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
