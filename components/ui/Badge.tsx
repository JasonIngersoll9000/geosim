type BadgeVariant =
  | "military"
  | "diplomatic"
  | "economic"
  | "political"
  | "intelligence"
  | "information"
  | "escalation"
  | "de-escalation"
  | "hold"
  | "critical"
  | "warning"
  | "stable"
  | "info"
  | "neutral";

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  military: {
    bg: "var(--status-critical-bg)",
    text: "var(--status-critical)",
    border: "var(--status-critical-border)",
  },
  escalation: {
    bg: "var(--status-critical-bg)",
    text: "var(--status-critical)",
    border: "var(--status-critical-border)",
  },
  critical: {
    bg: "var(--status-critical-bg)",
    text: "var(--status-critical)",
    border: "var(--status-critical-border)",
  },
  diplomatic: {
    bg: "var(--status-info-bg)",
    text: "var(--status-info)",
    border: "var(--status-info-border)",
  },
  info: {
    bg: "var(--status-info-bg)",
    text: "var(--status-info)",
    border: "var(--status-info-border)",
  },
  economic: {
    bg: "rgba(40, 140, 90, 0.20)",
    text: "#5EBD8E",
    border: "rgba(40, 140, 90, 0.30)",
  },
  stable: {
    bg: "var(--status-stable-bg)",
    text: "var(--status-stable)",
    border: "var(--status-stable-border)",
  },
  "de-escalation": {
    bg: "var(--status-stable-bg)",
    text: "var(--status-stable)",
    border: "var(--status-stable-border)",
  },
  warning: {
    bg: "var(--status-warning-bg)",
    text: "var(--gold)",
    border: "var(--gold-border)",
  },
  hold: {
    bg: "var(--status-warning-bg)",
    text: "var(--gold)",
    border: "var(--gold-border)",
  },
  political: {
    bg: "rgba(123, 104, 200, 0.15)",
    text: "#9B8FD8",
    border: "rgba(123, 104, 200, 0.30)",
  },
  intelligence: {
    bg: "rgba(232, 228, 220, 0.06)",
    text: "var(--text-secondary)",
    border: "var(--border-hi)",
  },
  information: {
    bg: "rgba(232, 228, 220, 0.06)",
    text: "var(--text-secondary)",
    border: "var(--border-hi)",
  },
  neutral: {
    bg: "rgba(232, 228, 220, 0.06)",
    text: "var(--text-secondary)",
    border: "var(--border-hi)",
  },
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = "" }: BadgeProps) {
  const style = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "9px",
        fontWeight: 400,
        letterSpacing: "0.03em",
        padding: "2px 7px",
        borderRadius: "4px",
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
