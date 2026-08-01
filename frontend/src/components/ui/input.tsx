import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border/40 bg-background px-4 py-2 text-sm transition-all duration-200 shadow-neo-pressed text-foreground",
          "file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-primary",
          "placeholder:text-muted-foreground/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-muted/20",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };