"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1.5">
              {title && (
                <ToastTitle className="text-sm font-bold tracking-tight">
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription className="text-xs leading-relaxed opacity-90">
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      {/* The Viewport handles the positioning on screen. 
          The previous update to ToastViewport ensures it respects 
          the Z-index and glassmorphism of the system.
      */}
      <ToastViewport />
    </ToastProvider>
  );
}