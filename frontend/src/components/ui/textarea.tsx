import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-xl border border-border/50 bg-background/40 backdrop-blur-md px-4 py-3 text-sm transition-all duration-300",
        "placeholder:text-muted-foreground/60 custom-scrollbar",
        "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:shadow-[0_0_20px_rgba(var(--primary),0.1)]",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-muted/20",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };