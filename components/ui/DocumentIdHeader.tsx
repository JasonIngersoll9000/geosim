interface DocumentIdHeaderProps {
  scenarioCode?: string;
  branchName?: string;
  turnNumber?: number;
  totalTurns?: number;
  text?: string;
}

export function DocumentIdHeader({
  scenarioCode = "WAR-GAME-IRN-2026-0322",
  branchName = "MAIN",
  turnNumber = 4,
  totalTurns = 12,
  text,
}: DocumentIdHeaderProps) {
  return (
    <div
      className="font-mono text-2xs text-text-tertiary uppercase tracking-[0.04em] py-3"
    >
      {text ?? (
        <>
          {scenarioCode}{' // BRANCH: '}{branchName}{' // TURN '}
          <span className="font-medium">
            {String(turnNumber).padStart(2, "0")}
          </span>{" "}
          / {String(totalTurns).padStart(2, "0")}
        </>
      )}
    </div>
  );
}
