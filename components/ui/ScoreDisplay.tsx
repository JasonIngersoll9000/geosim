interface ScoreDisplayProps {
  value: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(value: number): string {
  if (value >= 70) return "text-status-stable";
  if (value >= 40) return "text-status-warning";
  return "text-status-critical";
}

export function ScoreDisplay({ value, label, size = "md" }: ScoreDisplayProps) {
  const colorClass = getScoreColor(value);

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
        className={`font-mono font-medium ${colorClass}`}
        style={{
          fontSize: sizes[size].value,
        }}
      >
        {value}
      </div>
    </div>
  );
}
