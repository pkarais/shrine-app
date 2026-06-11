import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-[var(--secondary)] text-[var(--on-secondary)] hover:opacity-90 shadow-sm",
        gold: "gold-gradient text-[var(--on-secondary)] hover:opacity-90 shadow-lg shadow-[var(--secondary)]/20",
        sacred: "sacred-gradient text-[var(--on-primary)] hover:opacity-90 shadow-sm",
        ghost: "bg-transparent text-[var(--primary)] hover:bg-[var(--surface-container)]",
        outline: "bg-transparent text-[var(--primary)] border border-[color-mix(in-srgb,var(--outline-variant)_15%,transparent)] hover:bg-[var(--surface-container)]",
        danger: "bg-[var(--error)] text-white hover:bg-[#9a0000]",
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-xl",
        sm: "h-9 rounded-xl px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
