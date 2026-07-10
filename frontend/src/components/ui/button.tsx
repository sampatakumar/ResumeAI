import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Added transition-all, duration-300, and active:scale-[0.98] for a premium, tactile feel
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-primary/25 hover:shadow-lg",
        destructive: 
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-destructive/25 hover:shadow-lg",
        outline: 
          "border border-border/50 bg-background/40 backdrop-blur-md shadow-sm hover:bg-accent/50 hover:text-accent-foreground hover:border-border",
        secondary: 
          "bg-secondary/80 text-secondary-foreground backdrop-blur-sm shadow-sm hover:bg-secondary",
        ghost: 
          "hover:bg-primary/10 hover:text-primary",
        link: 
          "text-primary underline-offset-4 hover:underline",
        hero: 
          "bg-primary text-primary-foreground glow-primary font-semibold hover:brightness-110 hover:glow-strong shadow-md",
        "hero-outline": 
          "border-2 border-primary/30 bg-primary/5 text-primary backdrop-blur-md hover:bg-primary/15 hover:border-primary/60 font-semibold shadow-[0_0_15px_rgba(var(--primary),0.1)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-xl px-8 text-base", // Slightly taller and rounder for high-impact areas
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };