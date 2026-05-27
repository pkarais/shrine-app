import { TopAppBar } from "@/components/layout/TopAppBar"

export default function CalendarLoading() {
  return (
    <>
      <TopAppBar />
      <main className="max-w-5xl mx-auto px-4 pt-20 pb-24 min-h-screen">
        <div className="w-48 h-8 bg-surface-container-high rounded-lg animate-pulse mb-2" />
        <div className="w-36 h-4 bg-surface-container-high rounded animate-pulse mb-8" />
        <div className="card-surface rounded-2xl p-6 animate-pulse">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="h-4 bg-surface-container-high rounded" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square bg-surface-container-high rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
