"use client"

import { useEffect, useRef, useState } from "react"
import { ExternalLink } from "lucide-react"

interface PDFRendererProps {
  url: string
  onError: (msg: string) => void
}

/**
 * Native browser PDF viewer via <iframe>. Browsers (Chrome/Edge/Firefox/Safari)
 * have built-in PDF.js viewers that **stream** the file and start rendering
 * within ~100ms — vastly faster than react-pdf, which downloads the full file,
 * parses it in JS, and renders to canvas. Includes built-in zoom, page nav,
 * search, print, and download.
 *
 * Fallback: iOS Safari sometimes refuses to render PDFs inside iframes. We
 * detect when the iframe never fires `load` within 4s and surface an "Open in
 * new tab" link.
 */
export function PDFRenderer({ url, onError }: PDFRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [stalled, setStalled] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setStalled(false)
    const timer = window.setTimeout(() => {
      if (!iframeRef.current) return
      // If the iframe never reported "load" within 4s, assume the browser
      // can't render PDFs inline (most often iOS Safari) and show a fallback.
      setStalled((prev) => prev || !loaded)
    }, 4000)
    return () => window.clearTimeout(timer)
    // We deliberately do not depend on `loaded` — the closure captures the
    // current value via state setter on stalled set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  return (
    <div className="relative w-full h-full bg-[var(--surface-container)]">
      {!loaded && !stalled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={url}
        title="SOP PDF"
        className="w-full h-full border-0"
        onLoad={() => setLoaded(true)}
        onError={() => onError("Failed to load PDF.")}
      />

      {stalled && !loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--surface-container)] p-6 text-center">
          <p className="text-sm text-on-surface-variant max-w-xs">
            Your browser couldn&apos;t display this PDF inline. Open it in a new tab to view.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-4 h-4" />
            Open PDF
          </a>
        </div>
      )}
    </div>
  )
}
