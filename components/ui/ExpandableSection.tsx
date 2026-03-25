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
    <div className="border border-border-subtle rounded-none overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 font-mono text-sm text-status-info hover:bg-bg-surface-high transition-colors duration-150 bg-transparent border-none cursor-pointer text-left"
      >
        <span>{label}</span>
        <span
          className="text-text-tertiary text-md transition-transform duration-200"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0)" }}
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
