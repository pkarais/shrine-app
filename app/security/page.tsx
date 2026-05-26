"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"

export default function SecurityPage() {
  const router = useRouter()

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1920&q=80"
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
                security
              </span>
            </div>
            <span className="font-headline font-extrabold text-xl tracking-tight text-white">Security Standards</span>
          </div>

          <div className="space-y-6 text-white/80 font-body text-sm leading-relaxed">
            <h3 className="text-white font-headline font-bold text-lg">St. Nicholas National Shrine — Security Policy</h3>
            <p><strong className="text-white">Effective Date:</strong> January 1, 2026</p>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">1. Access Control</h4>
              <p>Access to the LandmarkOps portal is granted by role-based permissions (manager, operations, security, council). All credentials are managed through Supabase Authentication with multi-factor authentication available for manager accounts. Shared accounts are strictly prohibited.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">2. Data Encryption</h4>
              <p>All communications between clients and the LandmarkOps platform are encrypted using TLS 1.3. Database storage employs AES-256 encryption at rest. API keys and secrets are stored as environment variables and never exposed to client-side code.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">3. Audit Logging</h4>
              <p>All authentication events, data modifications, and administrative actions are logged with timestamps, user identifiers, and IP addresses. Logs are retained for a minimum of 90 days and reviewed weekly by the Director of Operations.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">4. Incident Response</h4>
              <p>Suspected security incidents must be reported immediately to the Director of Operations. Response procedures include isolation of affected systems, forensic analysis, user notification, and remediation within 24 hours of discovery.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">5. Third-Party Security</h4>
              <p>Third-party services integrated with the platform (Supabase, Vercel, SendGrid) are evaluated against SOC 2 compliance standards and maintain valid security certifications. Data processing agreements are in place with all vendors.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">6. Compliance</h4>
              <p>This platform complies with applicable data protection regulations. Annual security audits are conducted by independent assessors. Questions should be directed to the Director of Operations, St. Nicholas National Shrine.</p>
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
