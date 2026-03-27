interface SectionDividerProps {
  title: string;
  subtitle?: string;
}

export function SectionDivider({ title, subtitle }: SectionDividerProps) {
  return (
    <div
      className="select-none font-mono text-2xs text-text-tertiary uppercase tracking-[0.06em] mt-4 mb-3"
    >
      <div className="border-t border-border-subtle pt-2">
        {title}
        {subtitle && <span>{' // '}{subtitle}</span>}
      </div>
    </div>
  );
}
