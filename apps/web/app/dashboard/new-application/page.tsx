"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Briefcase } from "lucide-react";

interface Resume {
  id: string;
  filename: string;
  created_at: string;
}

export default function NewApplicationPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [form, setForm] = useState({
    resumeId: "",
    company: "",
    role: "",
    jobDescription: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/resume")
      .then((r) => r.json())
      .then((data) => {
        setResumes(data);
        if (data.length === 1) setForm((f) => ({ ...f, resumeId: data[0].id }));
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.resumeId || !form.company || !form.role || !form.jobDescription) {
      setError("All fields are required.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const { applicationId } = await res.json();
      router.push(`/coach/${applicationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-semibold">New Application</span>
      </nav>

      <main className="max-w-2xl mx-auto px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Briefcase className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold">Create Job Application</h1>
        </div>

        {resumes.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
            <p className="text-slate-400 mb-4">You need to upload a resume first.</p>
            <Link
              href="/dashboard/upload-resume"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Upload Resume
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Resume selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Resume</label>
              <select
                value={form.resumeId}
                onChange={(e) => setForm((f) => ({ ...f, resumeId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Select a resume…</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.filename}
                  </option>
                ))}
              </select>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Company</label>
              <input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="e.g. Stripe, Google, Acme Corp"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
              <input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Job Description
              </label>
              <textarea
                value={form.jobDescription}
                onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))}
                placeholder="Paste the full job description here…"
                rows={10}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                </>
              ) : (
                "Create Application & Start Coaching"
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
