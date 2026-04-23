import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { syncUser } from "@/lib/sync-user";

const createJobSchema = z.object({
  resumeId: z.string().uuid(),
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  jobDescription: z.string().min(10).max(20000),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success)
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });

  const { resumeId, company, role, jobDescription } = parsed.data;

  const internalUserId = await syncUser();

  const { data: resume } = await supabaseAdmin
    .from("resumes")
    .select("id")
    .eq("id", resumeId)
    .eq("user_id", internalUserId)
    .single();

  if (!resume) return new Response("Resume not found", { status: 404 });

  const { data: application, error } = await supabaseAdmin
    .from("job_applications")
    .insert({
      user_id: internalUserId,
      resume_id: resumeId,
      company,
      role,
      job_description: jobDescription,
    })
    .select()
    .single();

  if (error) return new Response(`Failed to create application: ${error.message}`, { status: 500 });

  fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/extract-keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ application_id: application.id, job_description: jobDescription }),
  }).catch(() => {});

  return Response.json({ applicationId: application.id });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!dbUser) return Response.json([]);

  const { data } = await supabaseAdmin
    .from("job_applications")
    .select("*")
    .eq("user_id", dbUser.id)
    .order("created_at", { ascending: false });

  return Response.json(data ?? []);
}
