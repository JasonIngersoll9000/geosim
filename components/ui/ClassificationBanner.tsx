export function ClassificationBanner({
  classification = "SECRET // GEOSIM ANALYTICAL FRAMEWORK // FOR RESEARCH USE ONLY",
}: {
  classification?: string;
}) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center"
      style={{
        height: "24px",
        background: "#0A0D12",
        borderBottom: "1px solid rgba(201, 152, 58, 0.25)",
        fontFamily: "var(--font-mono)",
        fontSize: "9px",
        letterSpacing: "0.12em",
        color: "rgba(201, 152, 58, 0.6)",
        textTransform: "uppercase",
      }}
    >
      <span aria-hidden="true">&#9670;&nbsp;&nbsp;</span>
      {classification}
      <span aria-hidden="true">&nbsp;&nbsp;&#9670;</span>
    </div>
  );
}
