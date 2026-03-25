interface TopBarProps {
  scenarioName?: string;
  turnNumber?: number;
  totalTurns?: number;
  phase?: string;
}

export function TopBar({
  scenarioName = "Iran Conflict Scenario",
  turnNumber = 4,
  totalTurns = 12,
  phase = "Planning",
}: TopBarProps) {
  return (
    <div
      className="fixed left-0 right-0 z-40 flex items-center px-4 bg-bg-surface-low"
      style={{
        top: "24px",
        height: "42px",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Wordmark */}
      <span
        className="font-sans font-bold text-gold"
        style={{
          fontSize: "16px",
          letterSpacing: "0.04em",
        }}
      >
        GEOSIM
      </span>

      {/* Separator */}
      <span
        className="mx-3"
        style={{
          width: "1px",
          height: "18px",
          background: "var(--border-subtle)",
          display: "inline-block",
        }}
      />

      {/* Scenario name */}
      <span
        className="font-mono text-text-tertiary"
        style={{
          fontSize: "10px",
          letterSpacing: "0.02em",
        }}
      >
        {scenarioName}
      </span>

      {/* Right side: turn indicator */}
      <div className="ml-auto flex items-center gap-3">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-tertiary)",
          }}
        >
          TURN {String(turnNumber).padStart(2, "0")} /{" "}
          {String(totalTurns).padStart(2, "0")}
        </span>
        <span
          className="px-2 py-0.5"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "var(--gold)",
            background: "var(--gold-dim)",
            borderRadius: "4px",
            border: "1px solid var(--gold-border)",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {phase}
        </span>
      </div>
    </div>
  );
}
