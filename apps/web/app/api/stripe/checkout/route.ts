import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const priceId = formData.get("priceId") as string;
  if (!priceId) return new Response("Missing priceId", { status: 400 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  const { data: dbUser } = await supabaseAdmin
    .from("users").select("stripe_customer_id").eq("clerk_id", userId).single();

  let customerId = dbUser?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { clerk_id: userId } });
    customerId = customer.id;
    await supabaseAdmin.from("users").update({ stripe_customer_id: customerId }).eq("clerk_id", userId);
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3001";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
  });

  return Response.redirect(session.url!, 303);
}
