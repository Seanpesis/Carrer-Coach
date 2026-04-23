export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <div className="h-5 w-36 bg-slate-800 rounded animate-pulse" />
        <div className="h-8 w-8 bg-slate-800 rounded-full animate-pulse" />
      </nav>
      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-56 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-36 bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-10 w-40 bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="mb-10">
          <div className="h-5 w-24 bg-slate-800 rounded animate-pulse mb-4" />
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-800/60 border border-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div>
          <div className="h-5 w-36 bg-slate-800 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-800/60 border border-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
