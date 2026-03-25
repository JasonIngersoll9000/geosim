interface ScoreDisplayProps {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(value: number): string {
  if (value >= 70) return "var(--status-stable)";
  if (value >= 50) return "var(--gold)";
  if (value >= 30) return "var(--status-warning)";
  return "var(--status-critical)";
}

export function ScoreDisplay({ value, label, size = "md" }: ScoreDisplayProps) {
  const color = getScoreColor(value);

  const sizes = {
    sm: { value: "13px", label: "9px" },
    md: { value: "15px", label: "9px" },
    lg: { value: "18px", label: "10px" },
  };

  return (
    <div>
      {label && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: sizes[size].label,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "3px",
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: sizes[size].value,
          fontWeight: 500,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
