export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--on-surface-variant)] label-text">Loading...</p>
      </div>
    </div>
  )
}
