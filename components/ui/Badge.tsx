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
  intelligence: "bg-status-info-bg text-status-info border border-status-info-border",
  stable:
    "bg-status-stable-bg text-status-stable border border-status-stable-border",
  "de-escalation":
    "bg-status-stable-bg text-status-stable border border-status-stable-border",
  warning: "bg-status-warning-bg text-status-warning border border-gold-border",
  hold: "bg-status-warning-bg text-status-stable border border-gold-border",
  economic:
    "bg-status-stable-bg text-status-stable border border-status-stable-border",
  political:
    "bg-actor-russia/15 text-actor-russia border border-actor-russia/25",
  information:
    "bg-bg-surface-high text-text-secondary border border-border-hi",
  neutral:
    "bg-bg-surface-high text-text-secondary border border-border-hi",
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = "" }: BadgeProps) {
  const baseClasses =
    "inline-flex items-center font-mono text-2xs font-normal tracking-[0.03em] py-0.5 px-[7px] rounded-none whitespace-nowrap";

  const twClasses = tailwindVariants[variant] ?? tailwindVariants.neutral!;

  return (
    <span className={`${baseClasses} ${twClasses} ${className}`}>
      {children}
    </span>
  );
}
