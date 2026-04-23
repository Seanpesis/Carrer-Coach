import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    features: ["1 resume", "3 job applications", "20 chat messages/mo", "Basic audit report"],
    cta: "Current plan",
    priceId: null,
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    features: ["Unlimited resumes", "Unlimited applications", "500 messages/mo", "PDF export", "Cover letter generator", "Priority responses"],
    cta: "Upgrade to Pro",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    highlight: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/mo",
    features: ["5 seats", "Everything in Pro", "Priority support", "API access", "Team dashboard"],
    cta: "Upgrade to Team",
    priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID,
    highlight: false,
  },
];

export default async function PricingPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg">CareerCoach AI</Link>
        {userId && (
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        )}
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-slate-400 text-lg">Start free. Upgrade when you&apos;re ready.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-7 border flex flex-col ${
                tier.highlight
                  ? "bg-blue-600 border-blue-500"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <div className="mb-6">
                <p className="font-semibold text-lg mb-1">{tier.name}</p>
                <p className="text-4xl font-black">
                  {tier.price}<span className="text-xl font-normal opacity-70">{tier.period}</span>
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />
                    <span className="opacity-90">{f}</span>
                  </li>
                ))}
              </ul>

              {tier.priceId ? (
                <form action="/api/stripe/checkout" method="POST">
                  <input type="hidden" name="priceId" value={tier.priceId} />
                  <button
                    type="submit"
                    className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${
                      tier.highlight
                        ? "bg-white text-blue-700 hover:bg-blue-50"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                  >
                    {tier.cta}
                  </button>
                </form>
              ) : (
                <div className={`w-full py-3 rounded-xl font-medium text-sm text-center opacity-60 border ${tier.highlight ? "border-white/30" : "border-slate-600"}`}>
                  {tier.cta}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
