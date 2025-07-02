import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-display",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:shadow-[var(--shadow-intense)] hover:scale-105 btn-glow",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_0_30px_hsl(var(--destructive)/0.4)]",
        outline:
          "border border-glass-border/40 glass-card text-foreground hover:bg-primary/10 hover:border-primary/60 hover:shadow-[var(--shadow-glow)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-[0_0_30px_hsl(var(--secondary)/0.3)] hover:scale-105",
        ghost: "hover:bg-glass/30 hover:text-foreground backdrop-blur-sm hover:shadow-[var(--shadow-glass)]",
        link: "text-primary underline-offset-4 hover:underline text-body",
        glass: "glass-card text-foreground hover:bg-glass/50 hover:border-primary/40 hover-glow",
        glow: "bg-primary text-primary-foreground shadow-[var(--shadow-intense)] hover:scale-110 hover:shadow-[0_0_60px_hsl(var(--primary)/0.5)] btn-glow relative overflow-hidden",
        "secondary-glow": "bg-secondary text-secondary-foreground shadow-[0_0_30px_hsl(var(--secondary)/0.4)] hover:scale-110 hover:shadow-[0_0_60px_hsl(var(--secondary)/0.6)] btn-glow",
      },
      size: {
        default: "h-12 px-6 py-3 text-sm",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-16 rounded-2xl px-10 text-base font-semibold",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
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
