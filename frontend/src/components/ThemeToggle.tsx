import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background neo-button text-foreground transition-all duration-300",
          className
        )}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 text-amber-500" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-background neo-button text-foreground transition-all duration-300 hover:scale-105 active:scale-95",
        isDark ? "shadow-neo-pressed text-amber-400" : "shadow-neo-raised text-amber-500",
        className
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 transition-transform duration-500 rotate-0 hover:rotate-45 text-amber-400" />
      ) : (
        <Moon className="h-4.5 w-4.5 transition-transform duration-500 -rotate-12 hover:rotate-0 text-slate-700 dark:text-slate-200" />
      )}
    </button>
  );
};

export default ThemeToggle;
