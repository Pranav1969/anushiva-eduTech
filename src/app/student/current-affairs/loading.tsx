// Shown instantly by Next.js while page.tsx waits for data.
export default function Loading() {
  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-14 animate-pulse rounded-2xl bg-slate-500/10" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-500/10" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-500/10" />
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="hidden h-96 animate-pulse rounded-2xl bg-slate-500/10 lg:col-span-4 lg:block" />
          <div className="space-y-6 lg:col-span-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-500/10" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}