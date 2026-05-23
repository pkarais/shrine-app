"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"

export default function SupportPage() {
  const router = useRouter()

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1545459720-aacaf5090835?w=1920&q=80"
          alt="Shrine Background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-primary/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6 py-12">
        <div className="glass-panel p-8 md:p-12 rounded-[2rem] shadow-2xl border border-white/20 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors font-label text-sm tracking-widest uppercase"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back
            </button>
          </div>

          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl byzantine-gradient shadow-lg">
              <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                support_agent
              </span>
            </div>
            <span className="font-headline font-extrabold text-xl tracking-tight text-white">Support Terminal</span>
          </div>

          <div className="space-y-6 text-white/80 font-body text-sm leading-relaxed">
            <h3 className="text-white font-headline font-bold text-lg">St. Nicholas National Shrine — Operational Support</h3>
            <p><strong className="text-white">Effective Date:</strong> January 1, 2026</p>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">System Status</h4>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
                <span className="text-white font-label text-sm tracking-wide uppercase">All Systems Operational</span>
              </div>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">Contact</h4>
              <p>For technical support or account issues, contact the Director of Operations:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-white">Director:</strong> Paul Karaisaridis</li>
                <li><strong className="text-white">Email:</strong> <a href="mailto:polichronis369@gmail.com" className="text-secondary-fixed hover:text-white underline transition-colors">polichronis369@gmail.com</a></li>
                <li><strong className="text-white">Location:</strong> St. Nicholas National Shrine, New York, NY</li>
                <li><strong className="text-white">Response Time:</strong> Within 24 hours during business days</li>
              </ul>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">Frequently Asked Questions</h4>
              <dl className="space-y-4 mt-2">
                <div>
                  <dt className="text-white font-semibold">How do I reset my password?</dt>
                  <dd>Use the &quot;Forgot Password&quot; link on the login page. A password reset link will be sent to your registered email address.</dd>
                </div>
                <div>
                  <dt className="text-white font-semibold">I cannot access my account.</dt>
                  <dd>Ensure you are using the correct email and password. If the issue persists, email <a href="mailto:polichronis369@gmail.com" className="text-secondary-fixed hover:text-white underline transition-colors">polichronis369@gmail.com</a> to verify your account status.</dd>
                </div>
                <div>
                  <dt className="text-white font-semibold">How do I update my profile information?</dt>
                  <dd>Once logged in, navigate to the Profile page to update your display name and contact details. Role changes must be approved by the Director of Operations.</dd>
                </div>
                <div>
                  <dt className="text-white font-semibold">How do I report a bug or issue?</dt>
                  <dd>Email <a href="mailto:polichronis369@gmail.com" className="text-secondary-fixed hover:text-white underline transition-colors">polichronis369@gmail.com</a> with a detailed description of the issue, including any error messages or screenshots.</dd>
                </div>
              </dl>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">Scheduled Maintenance</h4>
              <p>Platform maintenance is performed during off-hours. You will be notified via email at least 48 hours in advance of any scheduled downtime. Emergency maintenance may be performed with reduced notice during critical security events.</p>
            </section>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 w-full px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 text-xs font-medium tracking-widest uppercase">
        <div className="flex items-center gap-6">
          <span>Created by: Paul Karaisaridis, Director of Operations 2026 National Shrine.</span>
          <span className="hidden md:inline w-1 h-1 rounded-full bg-white/20" />
          <span>Operational Portal v4.2.0</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={() => router.push("/privacy")} className="hover:text-white transition-colors">Privacy Protocol</button>
          <button onClick={() => router.push("/security")} className="hover:text-white transition-colors">Security Standards</button>
          <button onClick={() => router.push("/support")} className="hover:text-white transition-colors">Support Terminal</button>
        </div>
      </footer>

      <div className="fixed top-0 right-0 p-12 pointer-events-none opacity-10">
        <div className="w-64 h-64 border-8 border-white rounded-full" />
      </div>
      <div className="fixed bottom-0 left-0 p-12 pointer-events-none opacity-5">
        <div className="w-96 h-96 border-[16px] border-secondary rounded-full" />
      </div>
    </main>
  )
}
