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

  const { error } = await supabaseAdmin
    .from("job_applications")
    .delete()
    .eq("id", id)
    .eq("user_id", dbUser.id);

  if (error) return new Response(error.message, { status: 500 });

  return new Response(null, { status: 204 });
}
