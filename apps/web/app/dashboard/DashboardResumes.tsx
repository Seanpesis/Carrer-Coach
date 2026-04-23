"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FileText, Trash2, Loader2 } from "lucide-react";

interface Resume {
  id: string;
  filename: string;
  created_at: string;
}

export function DashboardResumes({ resumes: initial }: { resumes: Resume[] }) {
  const router = useRouter();
  const [resumes, setResumes] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this resume? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/resume/${id}`, { method: "DELETE" });
      if (res.ok) {
        setResumes((prev) => prev.filter((r) => r.id !== id));
        router.refresh();
      }
    } finally {
      setDeleting(null);
    }
  }

  if (resumes.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-xl p-8 text-center">
        <p className="text-slate-400 mb-4">No resumes uploaded yet</p>
        <Link
          href="/dashboard/upload-resume"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Upload Resume
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {resumes.map((r) => (
        <div
          key={r.id}
          className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3 min-w-0">
            <FileText className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate text-sm">{r.filename}</p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDelete(r.id)}
            disabled={deleting === r.id}
            className="shrink-0 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 p-1 rounded"
            title="Delete resume"
          >
            {deleting === r.id ? (
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
