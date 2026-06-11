"use client"

import { useState } from "react"

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  size?: "sm" | "md" | "lg"
  onChange?: () => void
}

export function Switch({ checked, onCheckedChange, disabled = false, size = "md", onChange }: SwitchProps) {
  const handleToggle = () => {
    if (disabled) return
    onCheckedChange(!checked)
    onChange?.()
  }

  const sizeClasses = {
    sm: "w-8 h-4",
    md: "w-11 h-6",
    lg: "w-14 h-7"
  }

  const thumbClasses = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  }

  const translateClasses = {
    sm: checked ? "translate-x-5" : "translate-x-0.5",
    md: checked ? "translate-x-6" : "translate-x-0.5",
    lg: checked ? "translate-x-7" : "translate-x-0.5"
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleToggle}
      disabled={disabled}
      className={`
        relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
        ${sizeClasses[size]}
        ${checked ? "bg-primary" : "bg-outline-variant"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}
      `}
    >
      <span
        className={`
          inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
          ${thumbClasses[size]}
          ${translateClasses[size]}
        `}
      />
    </button>
  )
}
