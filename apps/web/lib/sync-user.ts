import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "./supabase";

export async function syncUser() {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        clerk_id: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? "",
        plan: "free",
      },
      { onConflict: "clerk_id" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`User sync failed: ${error.message}`);
  return data.id as string;
}
