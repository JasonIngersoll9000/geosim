export function ClassificationBanner({
  classification = "SECRET // WAR GAME ANALYTICAL FRAMEWORK // FOR RESEARCH USE ONLY",
}: {
  classification?: string;
}) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-banner bg-bg-base border-b border-border-subtle font-mono text-2xs tracking-[0.2em] text-gold uppercase flex items-center justify-center"
    >
      <span aria-hidden="true">&#9670;&nbsp;&nbsp;</span>
      {classification}
      <span aria-hidden="true">&nbsp;&nbsp;&#9670;</span>
    </div>
  );
}
