interface DocumentIdHeaderProps {
  scenarioCode?: string;
  branchName?: string;
  turnNumber?: number;
  totalTurns?: number;
}

export function DocumentIdHeader({
  scenarioCode = "GEOSIM-IRN-2026-0322",
  branchName = "MAIN",
  turnNumber = 4,
  totalTurns = 12,
}: DocumentIdHeaderProps) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "9px",
        letterSpacing: "0.04em",
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
      }}
    >
      {scenarioCode} // BRANCH: {branchName} // TURN{" "}
      <span style={{ fontWeight: 500 }}>
        {String(turnNumber).padStart(2, "0")}
      </span>{" "}
      / {String(totalTurns).padStart(2, "0")}
    </div>
  );
}
