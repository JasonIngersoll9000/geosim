interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}

function getAutoColorClass(value: number): string {
  if (value >= 70) return "bg-status-stable";
  if (value >= 40) return "bg-status-warning";
  return "bg-status-critical";
}

export function ProgressBar({
  value,
  max = 100,
  color,
  height = 4,
}: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  const fillClass = color ?? getAutoColorClass(value);

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
        className={fillClass}
        style={{
          height: "100%",
          width: `${percent}%`,
          borderRadius: "2px",
          transition: "width 300ms ease",
        }}
      />
    </div>
  );
}
