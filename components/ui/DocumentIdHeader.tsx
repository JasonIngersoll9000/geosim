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
      className="font-mono text-text-tertiary uppercase"
      style={{
        fontSize: "9px",
        letterSpacing: "0.04em",
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
