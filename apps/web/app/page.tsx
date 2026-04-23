import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <span className="text-xl font-bold tracking-tight">CareerCoach AI</span>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm text-slate-300 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-4 pt-24 pb-20 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/50 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-8">
          <Zap className="w-3.5 h-3.5" />
          Powered by Claude AI
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          Land your dream job with{" "}
          <span className="text-blue-400">AI career coaching</span>
        </h1>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          Upload your resume, paste a job description, and get expert AI guidance
          on exactly how to tailor your application — keyword gaps, rewritten
          bullets, and ATS scoring included.
        </p>
        <Link href="/sign-up" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
          Start for free <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-slate-500 text-sm mt-4">No credit card required</p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 pb-24 grid md:grid-cols-3 gap-8">
        {[
          {
            icon: <TrendingUp className="w-6 h-6 text-blue-400" />,
            title: "ATS Match Score",
            desc: "Instantly see how well your resume matches the job description with a 0-100 score and missing keyword analysis.",
          },
          {
            icon: <Zap className="w-6 h-6 text-blue-400" />,
            title: "AI Bullet Rewrites",
            desc: "Get 2-3 ranked rewrites for your weakest bullets, optimized for the specific role you're targeting.",
          },
          {
            icon: <Shield className="w-6 h-6 text-blue-400" />,
            title: "Chat Coach",
            desc: "Ask any career question and get answers grounded in your actual resume — not generic advice.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6"
          >
            <div className="mb-4">{f.icon}</div>
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-8 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">Simple pricing</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Free",
              price: "$0",
              features: ["1 resume", "3 job applications", "20 chat messages/mo"],
              cta: "Get started",
              highlight: false,
            },
            {
              name: "Pro",
              price: "$12/mo",
              features: [
                "Unlimited resumes",
                "Unlimited applications",
                "500 messages/mo",
                "PDF export",
              ],
              cta: "Start Pro",
              highlight: true,
            },
            {
              name: "Team",
              price: "$49/mo",
              features: ["5 seats", "Everything in Pro", "Priority support", "API access"],
              cta: "Start Team",
              highlight: false,
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-6 border ${
                tier.highlight
                  ? "bg-blue-600 border-blue-500"
                  : "bg-slate-800/50 border-slate-700/50"
              }`}
            >
              <p className="font-semibold text-lg">{tier.name}</p>
              <p className="text-3xl font-bold my-3">{tier.price}</p>
              <ul className="space-y-2 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="text-sm text-slate-300 flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={`block text-center py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  tier.highlight
                    ? "bg-white text-blue-700 hover:bg-blue-50"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
