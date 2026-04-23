import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Briefcase } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { supabaseAdmin } from "@/lib/supabase";
import { DashboardResumes } from "./DashboardResumes";
import { DashboardApplications } from "./DashboardApplications";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  // Resolve Clerk userId → internal Supabase UUID
  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const internalId = dbUser?.id ?? null;

  const [{ data: resumes }, { data: applications }] = await Promise.all([
    internalId
      ? supabaseAdmin
          .from("resumes")
          .select("id, filename, created_at")
          .eq("user_id", internalId)
          .order("created_at", { ascending: false })
      : { data: [] },
    internalId
      ? supabaseAdmin
          .from("job_applications")
          .select("id, role, company, match_score, created_at")
          .eq("user_id", internalId)
          .order("created_at", { ascending: false })
          .limit(20)
      : { data: [] },
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <span className="font-bold text-lg">CareerCoach AI</span>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
            Pricing
          </Link>
          <span className="text-sm text-slate-400">
            {user?.emailAddresses[0]?.emailAddress}
          </span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage your resumes and job applications
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/upload-resume"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Upload Resume
            </Link>
            <Link
              href="/dashboard/new-application"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Application
            </Link>
          </div>
        </div>

        {/* Resumes */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">Resumes</h2>
          </div>
          <DashboardResumes resumes={resumes ?? []} />
        </section>

        {/* Applications */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">Job Applications</h2>
          </div>
          <DashboardApplications applications={applications ?? []} />
        </section>
      </main>
    </div>
  );
}
