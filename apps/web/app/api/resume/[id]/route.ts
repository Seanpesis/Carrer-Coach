import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!dbUser) return new Response("User not found", { status: 404 });

  const { data: resume } = await supabaseAdmin
    .from("resumes")
    .select("id, storage_url, pinecone_namespace")
    .eq("id", id)
    .eq("user_id", dbUser.id)
    .single();

  if (!resume) return new Response("Not found", { status: 404 });

  // Delete from storage
  const urlParts = resume.storage_url.split("/resumes/");
  if (urlParts[1]) {
    await supabaseAdmin.storage.from("resumes").remove([urlParts[1]]);
  }

  await supabaseAdmin.from("resumes").delete().eq("id", id);

  return new Response(null, { status: 204 });
}
