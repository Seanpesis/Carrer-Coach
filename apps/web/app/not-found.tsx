import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-7xl font-black text-slate-800 mb-4">404</p>
        <h1 className="text-2xl font-bold mb-3">Page not found</h1>
        <p className="text-slate-400 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm transition-colors">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
