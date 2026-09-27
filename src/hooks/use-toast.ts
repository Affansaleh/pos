"use client";

import { toast as toastManager } from "@/components/ui/toast";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
};

function toast(options: ToastOptions) {
  const { title, description, variant, duration } = options;

  toastManager.add({
    title: title ?? "",
    description: description ?? "",
    type: variant === "destructive" ? "error" : "info",
    timeout: duration ?? 5000,
  });
}

export function useToast() {
  return { toast };
}
