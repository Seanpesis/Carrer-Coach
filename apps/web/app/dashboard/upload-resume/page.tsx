"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function UploadResumePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setError("");
    } else {
      setError("Only PDF files are supported.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected?.type === "application/pdf") {
      setFile(selected);
      setError("");
    } else {
      setError("Only PDF files are supported.");
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/resume", { method: "POST", body: formData });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-semibold">Upload Resume</span>
      </nav>

      <main className="max-w-xl mx-auto px-8 py-16">
        <h1 className="text-2xl font-bold mb-2">Upload your resume</h1>
        <p className="text-slate-400 mb-8 text-sm">PDF format only, max 10MB.</p>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <p className="text-lg font-medium">Resume uploaded successfully!</p>
            <p className="text-slate-400 text-sm">Redirecting to dashboard…</p>
          </div>
        ) : (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-2xl p-12 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="w-10 h-10 text-blue-400" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-slate-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Upload className="w-10 h-10" />
                  <p className="font-medium">Drag & drop your PDF here</p>
                  <p className="text-sm">or click to browse</p>
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                </>
              ) : (
                "Upload Resume"
              )}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
