"use client";

import { useEffect, useRef, useState } from "react";

type ToastTone = "success" | "error" | "info";
type ToastDetail = { message: string; tone?: ToastTone };
type ToastItem = ToastDetail & { id: number };

declare global {
  interface WindowEventMap {
    "playtested-toast": CustomEvent<ToastDetail>;
  }
}

export function showToast(message: string, tone: ToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>("playtested-toast", {
      detail: { message, tone },
    })
  );
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    function handleToast(event: WindowEventMap["playtested-toast"]) {
      const message = event.detail?.message?.trim();
      if (!message) return;

      const id = nextId.current++;
      const item: ToastItem = {
        id,
        message,
        tone: event.detail.tone ?? "success",
      };

      setToasts((current) => [...current.slice(-2), item]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3200);
    }

    window.addEventListener("playtested-toast", handleToast);
    return () => window.removeEventListener("playtested-toast", handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl shadow-black/40 backdrop-blur ${
            toast.tone === "error"
              ? "border-red-300/25 bg-[#211313]/95 text-red-100"
              : toast.tone === "info"
                ? "border-sky-300/25 bg-[#10191d]/95 text-sky-100"
                : "border-[#77f29b]/30 bg-[#101713]/95 text-[#c9fbd6]"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
