"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1920&q=80"
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
                privacy_tip
              </span>
            </div>
            <span className="font-headline font-extrabold text-xl tracking-tight text-white">Privacy Protocol</span>
          </div>

          <div className="space-y-6 text-white/80 font-body text-sm leading-relaxed">
            <h3 className="text-white font-headline font-bold text-lg">St. Nicholas National Shrine — Privacy Policy</h3>
            <p><strong className="text-white">Effective Date:</strong> January 1, 2026</p>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">1. Information We Collect</h4>
              <p>We collect personal information you voluntarily provide when registering for the LandmarkOps portal, including your name, email address, role, and organizational affiliation. We also collect usage data such as login timestamps, page interactions, and system logs to maintain operational security.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">2. How We Use Your Information</h4>
              <p>Your information is used solely to facilitate shrine operations: staff scheduling, security coordination, event management, and administrative communications. We do not sell, rent, or share your personal data with third parties except as required by law.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">3. Data Security</h4>
              <p>All data transmitted through the LandmarkOps portal is encrypted in transit using TLS 1.3 and at rest using AES-256. Access controls follow the principle of least privilege, and all access is logged and audited regularly by the Director of Operations.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">4. Data Retention</h4>
              <p>Personal data is retained for the duration of your affiliation with St. Nicholas National Shrine plus one year. You may request deletion of your data at any time by contacting the Director of Operations.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">5. Your Rights</h4>
              <p>You have the right to access, correct, or delete your personal data. Requests should be directed to the Director of Operations at St. Nicholas National Shrine, 40.7101341, -74.0132028.</p>
            </section>

            <section>
              <h4 className="text-white font-headline font-semibold mb-2">6. Contact</h4>
              <p>For privacy-related inquiries, contact the Director of Operations, St. Nicholas National Shrine, New York, NY.</p>
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
