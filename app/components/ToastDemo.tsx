"use client";

import { useEffect, useRef, useState } from "react";

type Toast = {
  id: number;
  title: string;
  message: string;
};

export default function ToastDemo() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setToast({
        id: Date.now(),
        title: "New playtest feedback",
        message: "A tester has submitted feedback. It’s also been added to your notifications.",
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 5500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-4 z-[100] flex justify-center sm:inset-x-auto sm:bottom-6 sm:right-6 sm:justify-end"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto w-full max-w-[390px] overflow-hidden rounded-xl border border-white/10 bg-[#111512] shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3 px-4 py-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#77f29b]/25 bg-[#77f29b]/10 text-[#77f29b]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
              <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-white">{toast.title}</p>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
                aria-label="Dismiss notification"
              >
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-400">{toast.message}</p>
            <p className="mt-2 text-[11px] font-medium text-[#77f29b]">Saved to notifications</p>
          </div>
        </div>
        <div className="h-0.5 w-full bg-white/[0.06]">
          <div className="h-full w-full origin-left bg-[#77f29b]/70 [animation:toast-life_5.5s_linear_forwards]" />
        </div>
        <style jsx>{`
          @keyframes toast-life {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
