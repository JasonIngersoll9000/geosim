interface SectionDividerProps {
  title: string;
  subtitle?: string;
}

export function SectionDivider({ title, subtitle }: SectionDividerProps) {
  return (
    <div
      className="select-none"
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "10px",
        letterSpacing: "0.06em",
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
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
