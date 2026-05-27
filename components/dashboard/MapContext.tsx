"use client"

import { useEffect, useState } from "react"

export function MapContext() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  const shrineLat = 40.7101341
  const shrineLng = -74.0132028

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        setLocationError(null)
      },
      { enableHighAccuracy: false, timeout: 5000 }
    )
  }, [])

  const userMarker = userLocation
    ? `<div style="position:absolute;left:${((userLocation.lng + 180) / 360) * 100}%;top:${(1 - (Math.log(Math.tan((userLocation.lat * Math.PI) / 180) + 1 / Math.cos((userLocation.lat * Math.PI) / 180)) / Math.PI) / 2) * 100}%;transform:translate(-50%,-50%);z-index:1000;"><div style="width:12px;height:12px;background:#4285f4;border:2px solid white;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div></div>`
    : ""

  return (
    <section className="bg-[var(--surface-container-low)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        <h4 className="font-semibold text-sm text-[var(--on-surface)]">Shrine Location</h4>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-[var(--outline-variant)]/15 h-48">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${shrineLng - 0.01}%2C${shrineLat - 0.008}%2C${shrineLng + 0.01}%2C${shrineLat + 0.008}&layer=mapnik&marker=${shrineLat}%2C${shrineLng}`}
          className="w-full h-full"
          title="Shrine Location Map"
        />
        {userLocation && (
          <div className="absolute bottom-2 left-2 bg-[var(--surface-container-lowest)] rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--primary)] flex items-center gap-1 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
            You are here
          </div>
        )}
      </div>

      <p className="text-[10px] text-[var(--on-surface-variant)] mt-2">
        Liberty Park, Lower Manhattan
      </p>
    </section>
  )
}
