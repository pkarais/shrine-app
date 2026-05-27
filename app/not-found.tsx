import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] p-6">
      <div className="text-center">
        <h1 className="display-lg text-[var(--on-surface)]">404</h1>
        <p className="body-lg mt-4 text-[var(--on-surface-variant)]">Page not found.</p>
        <Link
          href="/dashboard"
          className="inline-block mt-6 px-6 py-3 bg-[var(--secondary)] text-[var(--on-secondary)] rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
