"use client";

import { useEffect } from "react";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number;
}

export function SlideOverPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 420,
}: SlideOverPanelProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          background: "rgba(0, 0, 0, 0.4)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-y-auto bg-bg-surface-low border-l border-border-subtle transition-transform duration-200 ease-in-out"
        style={{
          width: `${width}px`,
          transform: open ? "translateX(0)" : `translateX(${width}px)`,
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-start justify-between px-4 py-3 border-b border-border-subtle">
            <div>
              <div className="font-label font-bold text-md text-text-primary uppercase tracking-[0.04em]">
                {title}
              </div>
              {subtitle && (
                <div className="font-mono text-2xs text-text-tertiary mt-1 tracking-[0.04em] uppercase">
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 font-mono text-[14px] text-text-tertiary bg-transparent border-none cursor-pointer transition-colors duration-150"
            >
              &times;
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
