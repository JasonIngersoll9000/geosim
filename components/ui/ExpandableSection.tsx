"use client";

import { useState } from "react";

interface ExpandableSectionProps {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function ExpandableSection({
  label,
  defaultOpen = false,
  children,
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between transition-colors duration-150"
        style={{
          padding: "8px 12px",
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--status-info)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>{label}</span>
        <span
          style={{
            color: "var(--text-tertiary)",
            fontSize: "13px",
            transition: "transform 200ms ease",
            transform: open ? "rotate(45deg)" : "rotate(0)",
          }}
        >
          +
        </span>
      </button>
      <div
        className={`chronicle-detail ${open ? "open" : ""}`}
        style={{ padding: open ? "12px" : "0 12px" }}
      >
        {children}
      </div>
    </div>
  );
}
