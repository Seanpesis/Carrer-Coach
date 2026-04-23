import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { CAREER_COACH_SYSTEM_PROMPT, AUDIT_PROMPT } from "@/lib/prompts";

const bodySchema = z.object({ applicationId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const { applicationId } = parsed.data;

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

  if (!application) return new Response("Not found", { status: 404 });

  // Try RAG context, fall back to raw_text, fall back to empty
  let resumeContext = "";
  const namespace = (application.resumes as { pinecone_namespace?: string; raw_text?: string } | null)?.pinecone_namespace;
  const rawText = (application.resumes as { raw_text?: string } | null)?.raw_text ?? "";

  if (namespace) {
    try {
      const { embedQuery } = await import("@/lib/openai");
      const { queryResumeChunks } = await import("@/lib/pinecone");
      const embedding = await embedQuery(AUDIT_PROMPT);
      resumeContext = await queryResumeChunks(embedding, namespace, 10);
    } catch {
      resumeContext = rawText;
    }
  } else {
    resumeContext = rawText;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let responseText: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: CAREER_COACH_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${AUDIT_PROMPT}\n\n--- JOB DESCRIPTION ---\n${application.job_description}\n\n--- RESUME CONTENT ---\n${resumeContext || "No resume content available."}`,
        },
      ],
    });
    responseText = message.content[0].type === "text" ? message.content[0].text : "";
  } catch (err) {
    return new Response(`Claude API error: ${err instanceof Error ? err.message : err}`, { status: 500 });
  }

  let report: Record<string, unknown>;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    report = JSON.parse(jsonMatch?.[0] ?? responseText);
  } catch {
    return new Response(`Failed to parse audit report: ${responseText.slice(0, 200)}`, { status: 500 });
  }

  await supabaseAdmin
    .from("job_applications")
    .update({ match_score: report.match_score as number })
    .eq("id", applicationId);

  return Response.json(report);
}
