"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <p className="text-5xl mb-6">⚠️</p>
        <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
        <p className="text-slate-400 mb-8 text-sm">{error.message || "An unexpected error occurred."}</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Try again
          </button>
          <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
