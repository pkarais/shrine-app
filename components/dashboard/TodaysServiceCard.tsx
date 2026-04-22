"use client"

import Image from "next/image"

export function TodaysServiceCard() {
  return (
    <div className="mt-8 bg-surface-container-low rounded-[2rem] overflow-hidden flex flex-col md:flex-row group cursor-pointer transition-all hover:bg-surface-container">
      <div className="md:w-1/3 h-48 md:h-auto relative">
        <Image
          src="https://images.unsplash.com/photo-1545459720-aacaf5090835?w=600&q=80"
          alt="Orthodox liturgy"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
      </div>
      <div className="p-8 md:w-2/3 flex flex-col justify-center">
        <div className="flex justify-between items-start mb-2">
          <span className="font-label text-xs uppercase tracking-widest text-on-tertiary-fixed-variant bg-tertiary-fixed px-3 py-1 rounded-full">
            GOA Archdiocese
          </span>
          <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
            open_in_new
          </span>
        </div>
        <h4 className="font-headline text-2xl font-bold text-primary mb-2">
          Today&apos;s Digital Chant Stand
        </h4>
        <p className="text-on-surface-variant font-body mb-4">
          Daily Service for Monday of the Holy Spirit. Access rubrics, prayers, and hymnal summaries for the 10:00 AM Liturgy.
        </p>
        <div className="flex gap-4">
          <button className="text-primary font-bold text-sm flex items-center gap-1 hover:text-primary-container transition-colors">
            <span className="material-symbols-outlined text-sm">description</span> Read PDF
          </button>
          <button className="text-primary font-bold text-sm flex items-center gap-1 hover:text-primary-container transition-colors">
            <span className="material-symbols-outlined text-sm">volume_up</span> Audio Summary
          </button>
        </div>
      </div>
    </div>
  )
}
