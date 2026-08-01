import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-neo-raised-sm hover:shadow-neo-raised hover:brightness-105 active:shadow-neo-pressed-sm border border-primary/20",
        destructive:
          "bg-destructive text-destructive-foreground shadow-neo-raised-sm hover:shadow-neo-raised active:shadow-neo-pressed-sm border border-destructive/20",
        outline:
          "bg-background text-foreground shadow-neo-raised-sm hover:shadow-neo-raised hover:text-primary active:shadow-neo-pressed-sm border border-border/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-neo-raised-sm hover:shadow-neo-raised active:shadow-neo-pressed-sm border border-border/40",
        ghost:
          "hover:bg-background/80 hover:shadow-neo-raised-sm hover:text-primary active:shadow-neo-pressed-sm",
        link:
          "text-primary underline-offset-4 hover:underline",
        hero:
          "bg-primary text-primary-foreground shadow-neo-raised hover:shadow-neo-raised-lg hover:brightness-110 active:shadow-neo-pressed font-semibold border border-primary/30 glow-primary",
        "hero-outline":
          "bg-background text-primary shadow-neo-raised hover:shadow-neo-raised-lg active:shadow-neo-pressed font-semibold border border-primary/40",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
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