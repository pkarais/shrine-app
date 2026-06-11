import { TopAppBar } from "@/components/layout/TopAppBar"

export default function DashboardLoading() {
  return (
    <>
      <TopAppBar />
      <main className="max-w-4xl mx-auto px-4 pt-20 pb-24 min-h-screen">
        <div className="w-64 h-8 bg-surface-container-high rounded-lg animate-pulse mb-2" />
        <div className="w-48 h-4 bg-surface-container-high rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-surface rounded-2xl p-5 animate-pulse">
              <div className="w-20 h-4 bg-surface-container-high rounded mb-3" />
              <div className="w-16 h-8 bg-surface-container-high rounded" />
            </div>
          ))}
        </div>
        <div className="card-surface rounded-2xl p-6 animate-pulse space-y-4">
          <div className="w-40 h-6 bg-surface-container-high rounded" />
          <div className="w-full h-4 bg-surface-container-high rounded" />
          <div className="w-3/4 h-4 bg-surface-container-high rounded" />
          <div className="w-1/2 h-4 bg-surface-container-high rounded" />
        </div>
      </main>
    </>
  )
}
