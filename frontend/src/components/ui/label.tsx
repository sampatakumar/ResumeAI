import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-semibold leading-none tracking-tight transition-all duration-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root 
    ref={ref} 
    className={cn(
      labelVariants(), 
      "text-foreground/90", // Thematic soft-foreground
      className
    )} 
    {...props} 
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };