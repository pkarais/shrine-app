"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowRight, Shield } from "lucide-react"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { useTheme } from "@/components/theme/ThemeProvider"

export default function LandingPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-surface transition-colors duration-300">
      {/* Background Effects - Adapt to theme */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface-container to-surface" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/50 rounded-full blur-[96px]" />
        </div>
      </div>

      {/* Theme Toggle - Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center text-center">
        {/* Hero Image - Switches based on theme */}
        <div className="relative w-full max-w-md mb-8 animate-fade-in">
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={isDarkMode ? "/landing/hero-dark.png" : "/landing/hero.png"}
              alt="Shrine Operations"
              fill
              priority
              className="object-contain drop-shadow-2xl transition-opacity duration-300"
            />
          </div>
        </div>

        {/* Title - Uses theme colors */}
        <h1 className="font-headline text-4xl md:text-6xl font-extrabold text-on-surface leading-tight mb-4 tracking-tight">
          Shrine <span className="text-primary">Operations</span>
        </h1>

        {/* Tagline - Uses theme colors */}
        <p className="text-lg md:text-xl text-on-surface-variant max-w-lg mb-10 leading-relaxed">
          The sacred operational core for national landmarks. 
          Manage daily liturgy, staff logistics, and site security with reverent precision.
        </p>

        {/* Onboard Button - Uses theme colors */}
        <button
          onClick={() => router.push("/login")}
          className="group relative px-10 py-5 bg-secondary hover:bg-secondary/90 text-on-secondary font-bold text-lg rounded-2xl shadow-2xl shadow-secondary/30 hover:shadow-secondary/50 transition-all duration-300 flex items-center gap-3 animate-pulse-slow"
        >
          <Shield className="w-6 h-6" />
          <span>Onboard to the App</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Subtle Text - Uses theme colors */}
        <p className="mt-8 text-sm text-on-surface-variant/60 font-medium tracking-widest uppercase">
          Credentialed Staff & Managers Only
        </p>
      </div>

      {/* Decorative Elements - Uses theme colors */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline to-transparent" />
      
      {/* Corner Accents - Uses theme colors */}
      <div className="fixed top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-outline/20 rounded-tl-3xl pointer-events-none" />
      <div className="fixed top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-outline/20 rounded-tr-3xl pointer-events-none" />
      <div className="fixed bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-outline/20 rounded-bl-3xl pointer-events-none" />
      <div className="fixed bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-outline/20 rounded-br-3xl pointer-events-none" />

      {/* Footer - Uses theme colors */}
      <footer className="absolute bottom-6 w-full px-6 text-center">
        <p className="text-on-surface-variant/50 text-xs tracking-wider">
          National Shrine Operations Portal
        </p>
      </footer>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        @keyframes pulse-slow {
          0%, 100% { box-shadow: 0 0 30px rgba(115, 92, 0, 0.3); }
          50% { box-shadow: 0 0 50px rgba(115, 92, 0, 0.5); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
