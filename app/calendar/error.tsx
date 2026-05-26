"use client"

export default function CalendarError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="card-surface rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-on-error-container text-3xl">error</span>
        </div>
        <h1 className="headline-sm text-on-surface">Calendar Error</h1>
        <p className="body-md text-on-surface-variant">Failed to load calendar data. Please try again.</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary text-on-primary rounded-xl font-headline font-bold hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </main>
  )
}
