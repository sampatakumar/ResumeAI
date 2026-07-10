"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: cn(
            "group toast rounded-2xl border border-border/40 shadow-2xl transition-all duration-300",
            "group-[.toaster]:glass group-[.toaster]:bg-background/60 group-[.toaster]:backdrop-blur-xl",
            "group-[.toaster]:text-foreground group-[.toaster]:p-4"
          ),
          title: "font-bold tracking-tight text-sm",
          description: "group-[.toast]:text-muted-foreground/80 text-xs leading-relaxed",
          actionButton: 
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold group-[.toast]:rounded-lg group-[.toast]:transition-transform active:scale-95",
          cancelButton: 
            "group-[.toast]:bg-muted/50 group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:backdrop-blur-sm",
          // Thematic color overrides
          success: "group-[.toast]:text-primary group-[.toast]:border-primary/30",
          error: "group-[.toast]:text-destructive group-[.toast]:border-destructive/30",
        },
      }}
      {...props}
    />
  );
};

/** * Helper for internal styling since we aren't importing 'cn' 
 * in the original snippet, but it's required for the logic above.
 */
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export { Toaster, toast };