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

const valueSizeClass = {
  sm: "text-md",   // 13px
  md: "text-lg",   // 15px
  lg: "text-[18px]",
};

const labelSizeClass = {
  sm: "text-2xs",  // 9px
  md: "text-2xs",  // 9px
  lg: "text-xs",   // 10px
};

export function ScoreDisplay({ value, label, size = "md" }: ScoreDisplayProps) {
  const colorClass = getScoreColor(value);

  return (
    <div>
      {label && (
        <div
          className={`font-mono ${labelSizeClass[size]} text-text-tertiary uppercase tracking-[0.08em] mb-[3px]`}
        >
          {label}
        </div>
      )}
      <div className={`font-mono font-medium ${valueSizeClass[size]} ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}
