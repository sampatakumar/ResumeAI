import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 transition-opacity duration-500",
      // Horizontal Gradient Fade
      orientation === "horizontal" 
        ? "h-[1px] w-full bg-gradient-to-r from-transparent via-border/60 to-transparent" 
        : "h-full w-[1px] bg-gradient-to-b from-transparent via-border/60 to-transparent",
      // Subtle Primary Tint
      "opacity-50 hover:opacity-100",
      className
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };