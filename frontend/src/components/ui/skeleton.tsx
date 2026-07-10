import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Base glass layer
        "relative overflow-hidden rounded-xl bg-muted/20 backdrop-blur-sm",
        // Shimmer effect via pseudo-element
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-primary/10 before:to-transparent",
        "animate-pulse duration-1000",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };