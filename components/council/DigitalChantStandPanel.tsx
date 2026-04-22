"use client"

import { useState } from "react"

export function DigitalChantStandPanel({ dcsUrl }: { dcsUrl: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="btn-secondary px-4 py-2 inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">menu_book</span>
          {isOpen ? "Hide Chant Stand" : "Open Chant Stand"}
        </button>
        <a
          href={dcsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary px-4 py-2 inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">open_in_new</span>
          Open in New Tab
        </a>
      </div>

      {isOpen ? (
        <div className="rounded-xl overflow-hidden border border-outline-variant/20">
          <iframe
            src={dcsUrl}
            title="Digital Chant Stand Reference"
            className="w-full h-[55vh] md:h-[380px] bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Digital Chant Stand is hidden. Click Open Chant Stand to load today&apos;s page.
        </div>
      )}
    </div>
  )
}
