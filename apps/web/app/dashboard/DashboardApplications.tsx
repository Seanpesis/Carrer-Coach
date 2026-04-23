"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Loader2 } from "lucide-react";

interface Application {
  id: string;
  role: string;
  company: string;
  match_score: number | null;
  created_at: string;
}

export function DashboardApplications({ applications: initial }: { applications: Application[] }) {
  const router = useRouter();
  const [applications, setApplications] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Delete this application and its chat history?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a.id !== id));
        router.refresh();
      }
    } finally {
      setDeleting(null);
    }
  }

  if (applications.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-8 text-center">
        <p className="text-slate-400">No applications yet. Create one to start coaching.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <div key={app.id} className="relative group">
          <Link
            href={`/coach/${app.id}`}
            className="flex items-center justify-between bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-blue-600/50 transition-colors pr-14"
          >
            <div>
              <p className="font-medium">{app.role}</p>
              <p className="text-sm text-slate-400">{app.company}</p>
            </div>
            <div className="flex items-center gap-3">
              {app.match_score !== null && (
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    app.match_score >= 70
                      ? "bg-green-900/50 text-green-400"
                      : app.match_score >= 40
                      ? "bg-yellow-900/50 text-yellow-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {app.match_score}%
                </span>
              )}
              <span className="text-slate-500 text-sm">
                {new Date(app.created_at).toLocaleDateString()}
              </span>
            </div>
          </Link>
          <button
            onClick={(e) => handleDelete(app.id, e)}
            disabled={deleting === app.id}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 p-1.5 rounded opacity-0 group-hover:opacity-100"
            title="Delete application"
          >
            {deleting === app.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
