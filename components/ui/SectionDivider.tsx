interface SectionDividerProps {
  title: string;
  subtitle?: string;
}

export function SectionDivider({ title, subtitle }: SectionDividerProps) {
  return (
    <div
      className="select-none font-sans text-[10px] text-text-tertiary uppercase"
      style={{
        letterSpacing: "0.06em",
        margin: "16px 0 12px",
      }}
    >
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "8px",
        }}
      >
        {title}
        {subtitle && <span> // {subtitle}</span>}
      </div>
    </div>
  );
}
