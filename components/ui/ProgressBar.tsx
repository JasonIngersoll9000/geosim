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
      className="bg-bg-surface-high rounded-none overflow-hidden"
      style={{ height: `${height}px` }}
    >
      <div
        className={`${fillClass} h-full rounded-none transition-[width] duration-300 ease-in-out`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
