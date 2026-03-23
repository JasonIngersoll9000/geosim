interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}

function getAutoColor(value: number): string {
  if (value >= 70) return "var(--status-stable)";
  if (value >= 50) return "var(--gold)";
  if (value >= 30) return "var(--status-warning)";
  return "var(--status-critical)";
}

export function ProgressBar({
  value,
  max = 100,
  color,
  height = 4,
}: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  const fillColor = color ?? getAutoColor(value);

  return (
    <div
      style={{
        height: `${height}px`,
        background: "var(--bg-surface-2)",
        borderRadius: "2px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${percent}%`,
          background: fillColor,
          borderRadius: "2px",
          transition: "width 300ms ease",
        }}
      />
    </div>
  );
}
