import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const applicationId = req.nextUrl.searchParams.get("applicationId");
  if (!applicationId) return new Response("Missing applicationId", { status: 400 });

  const { data: dbUser } = await supabaseAdmin
    .from("users").select("id").eq("clerk_id", userId).single();
  if (!dbUser) return Response.json([]);

  const { data: app } = await supabaseAdmin
    .from("job_applications")
    .select("id")
    .eq("id", applicationId)
    .eq("user_id", dbUser.id)
    .single();
  if (!app) return new Response("Not found", { status: 404 });

  const { data: messages } = await supabaseAdmin
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
    .limit(100);

  return Response.json(messages ?? []);
}
