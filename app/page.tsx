"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, Shield } from "lucide-react"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-surface transition-colors duration-300">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/shrine-hero.jpg"
          alt="St. Nicholas Greek Orthodox Church"
          className="w-full h-full object-cover opacity-15 dark:opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/60 to-surface/90 dark:from-surface/90 dark:via-surface/80 dark:to-surface/95" />
      </div>

      {/* Theme Toggle - Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center">
        
        {/* Hero Card — Image fills card, frosted text panel at bottom */}
        <div className="w-full max-w-2xl mb-10 animate-fade-in">
          <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl border border-outline-variant/30">
            
            {/* Image fills entire card */}
            <div className="relative aspect-[16/10] w-full">
              <img
                src="/images/shrine-hero.jpg"
                alt="St. Nicholas Greek Orthodox Church"
                className="w-full h-full object-cover"
              />
              {/* Bottom gradient so text is readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-surface/95 via-surface/40 to-transparent dark:from-surface dark:via-surface/50" />
            </div>
            
            {/* Frosted text panel at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <div className="bg-white/20 dark:bg-black/40 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-white/30 dark:border-white/10 shadow-lg">
                <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold text-on-surface leading-tight tracking-tight">
                  Shrine <span className="text-primary">Operations</span>
                </h1>
                <p className="text-sm sm:text-base text-on-surface-variant mt-2 max-w-md mx-auto">
                  The sacred operational core for national landmarks. 
                  Manage daily liturgy, staff logistics, and site security with reverent precision.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => router.push("/login")}
            className="group relative px-10 py-5 bg-secondary hover:bg-secondary/90 text-on-secondary font-bold text-lg rounded-2xl shadow-2xl shadow-secondary/30 hover:shadow-secondary/50 transition-all duration-300 flex items-center gap-3 animate-pulse-slow"
          >
            <Shield className="w-6 h-6" />
            <span>Onboard to the App</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Subtle Text */}
        <p className="mt-8 text-sm text-on-surface-variant/60 font-medium tracking-widest uppercase">
          Credentialed Staff & Managers Only
        </p>
      </div>

      {/* Decorative Elements */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-outline to-transparent" />
      
      {/* Corner Accents */}
      <div className="fixed top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-outline/20 rounded-tl-3xl pointer-events-none" />
      <div className="fixed top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-outline/20 rounded-tr-3xl pointer-events-none" />
      <div className="fixed bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-outline/20 rounded-bl-3xl pointer-events-none" />
      <div className="fixed bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-outline/20 rounded-br-3xl pointer-events-none" />

      {/* Footer */}
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
