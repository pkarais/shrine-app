"use client"

interface ChantStandCardProps {
  dcsLink?: string | null
}

export function ChantStandCard({ dcsLink }: ChantStandCardProps) {
  if (!dcsLink) return null

  return (
    <div className="card-surface p-0 overflow-hidden bg-surface-container-low">
      <div className="p-6 bg-primary/5 flex items-center justify-between">
        <h3 className="font-headline text-xl font-bold text-primary">Digital Chant Stand</h3>
        <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
          GOA Archdiocese
        </span>
      </div>
      <div className="aspect-[4/3] w-full">
        <iframe
          src={dcsLink}
          className="w-full h-full border-0"
          title="Digital Chant Stand"
          allow="autoplay"
        />
      </div>
    </div>
  )
}
