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

// Variants that use Tailwind utility classes (so toHaveClass() works in tests)
const tailwindVariants: Partial<Record<BadgeVariant, string>> = {
  military:
    "bg-status-critical-bg text-status-critical border border-status-critical-border",
  critical:
    "bg-status-critical-bg text-status-critical border border-status-critical-border",
  escalation:
    "bg-status-critical-bg text-status-critical border border-status-critical-border",
  diplomatic:
    "bg-status-info-bg text-status-info border border-status-info-border",
  info: "bg-status-info-bg text-status-info border border-status-info-border",
  stable:
    "bg-status-stable-bg text-status-stable border border-status-stable-border",
  "de-escalation":
    "bg-status-stable-bg text-status-stable border border-status-stable-border",
  warning: "bg-status-warning-bg text-gold border border-gold-border",
  hold: "bg-status-warning-bg text-gold border border-gold-border",
};

// Remaining variants still use inline styles (complex/rgba values not in Tailwind)
const inlineVariantStyles: Partial<
  Record<BadgeVariant, { bg: string; text: string; border: string }>
> = {
  economic: {
    bg: "rgba(40, 140, 90, 0.20)",
    text: "#5EBD8E",
    border: "rgba(40, 140, 90, 0.30)",
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
  const baseClasses =
    "inline-flex items-center font-mono rounded-none whitespace-nowrap";

  const twClasses = tailwindVariants[variant];
  const inlineStyle = inlineVariantStyles[variant];

  if (twClasses) {
    return (
      <span
        className={`${baseClasses} ${twClasses} ${className}`}
        style={{
          fontSize: "9px",
          fontWeight: 400,
          letterSpacing: "0.03em",
          padding: "2px 7px",
        }}
      >
        {children}
      </span>
    );
  }

  // Fallback to inline styles for variants not in Tailwind map
  return (
    <span
      className={`${baseClasses} ${className}`}
      style={{
        fontSize: "9px",
        fontWeight: 400,
        letterSpacing: "0.03em",
        padding: "2px 7px",
        background: inlineStyle?.bg,
        color: inlineStyle?.text,
        border: `1px solid ${inlineStyle?.border}`,
      }}
    >
      {children}
    </span>
  );
}
