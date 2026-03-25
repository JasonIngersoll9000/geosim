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
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-y-auto bg-bg-surface-low"
        style={{
          width: `${width}px`,
          borderLeft: "1px solid var(--border-subtle)",
          transform: open ? "translateX(0)" : `translateX(${width}px)`,
          transition: "transform 200ms ease",
        }}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-start justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-space-grotesk)",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "var(--text-primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {title}
              </div>
              {subtitle && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    color: "var(--text-tertiary)",
                    marginTop: "4px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 transition-colors duration-150"
              style={{
                color: "var(--text-tertiary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "14px",
              }}
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
