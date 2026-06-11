"use client"

import { useEffect, useRef } from "react"

interface ParallaxHeroProps {
  imageUrl: string
  className?: string
}

export function ParallaxHero({ imageUrl, className = "" }: ParallaxHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const imgRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const section = sectionRef.current
      const img = imgRef.current
      if (!section || !img) return
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight || 1
      // progress: -1 when section is just above viewport, +1 when below
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh
      // translate background opposite scroll for parallax (max ~120px)
      const translate = Math.max(-160, Math.min(160, progress * -120))
      img.style.transform = `translate3d(0, ${translate}px, 0)`
    }
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`relative rounded-[2rem] overflow-hidden h-[32rem] md:h-[44rem] lg:h-[52rem] ${className}`}
    >
      <div
        ref={imgRef}
        className="absolute -inset-y-32 inset-x-0 bg-cover bg-center will-change-transform"
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
    </section>
  )
}
