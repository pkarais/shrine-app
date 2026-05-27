import { TopAppBar } from "@/components/layout/TopAppBar"

export default function ProfileLoading() {
  return (
    <>
      <TopAppBar />
      <main className="max-w-2xl mx-auto px-4 pt-20 pb-24 min-h-screen">
        <div className="w-48 h-8 bg-surface-container-high rounded-lg animate-pulse mb-2" />
        <div className="w-32 h-4 bg-surface-container-high rounded animate-pulse mb-8" />
        <div className="card-surface rounded-2xl p-6 animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-surface-container-high" />
            <div className="space-y-2 flex-1">
              <div className="w-40 h-5 bg-surface-container-high rounded" />
              <div className="w-28 h-4 bg-surface-container-high rounded" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="w-full h-4 bg-surface-container-high rounded" />
            <div className="w-3/4 h-4 bg-surface-container-high rounded" />
            <div className="w-1/2 h-4 bg-surface-container-high rounded" />
          </div>
        </div>
      </main>
    </>
  )
}
