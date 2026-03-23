import { TopBar } from "@/components/ui/TopBar";
import { DocumentIdHeader } from "@/components/ui/DocumentIdHeader";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreDisplay } from "@/components/ui/ScoreDisplay";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default function Home() {
  return (
    <>
      <TopBar />
      <main
        className="topo-grid"
        style={{
          paddingTop: "calc(24px + 42px + 24px)",
          paddingLeft: "32px",
          paddingRight: "32px",
          paddingBottom: "48px",
          minHeight: "100vh",
        }}
      >
        <DocumentIdHeader />

        <h1
          style={{
            fontFamily: "var(--font-condensed)",
            fontWeight: 700,
            fontSize: "28px",
            color: "var(--text-primary)",
            marginTop: "16px",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          Strategic Simulation Engine
        </h1>

        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "15px",
            lineHeight: 1.75,
            color: "var(--text-secondary)",
            maxWidth: "600px",
            marginTop: "12px",
          }}
        >
          AI-powered modeling of competitive dynamics between nations,
          organizations, and factions. Explore branching &ldquo;what
          if&rdquo; scenarios grounded in real-world intelligence data.
        </p>

        <SectionDivider
          title="System Status"
          subtitle="All components operational"
        />

        {/* Design system showcase */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="military">Military</Badge>
          <Badge variant="diplomatic">Diplomatic</Badge>
          <Badge variant="economic">Economic</Badge>
          <Badge variant="political">Political</Badge>
          <Badge variant="intelligence">Intelligence</Badge>
          <Badge variant="escalation">Escalation</Badge>
          <Badge variant="de-escalation">De-escalation</Badge>
          <Badge variant="hold">Hold Rung</Badge>
          <Badge variant="critical">Critical</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="stable">Stable</Badge>
          <Badge variant="info">Info</Badge>
        </div>

        <SectionDivider title="Global Indicators" subtitle="Turn 04" />

        <div className="grid grid-cols-4 gap-3 mt-2" style={{ maxWidth: "500px" }}>
          <div
            className="p-2"
            style={{
              background: "var(--bg-surface-2)",
              borderRadius: "5px",
            }}
          >
            <ScoreDisplay value={142} label="Oil $/bbl" size="md" />
          </div>
          <div
            className="p-2"
            style={{
              background: "var(--bg-surface-2)",
              borderRadius: "5px",
            }}
          >
            <ScoreDisplay value={31} label="US Support" size="md" />
          </div>
          <div
            className="p-2"
            style={{
              background: "var(--bg-surface-2)",
              borderRadius: "5px",
            }}
          >
            <ScoreDisplay value={42} label="Air Defense" size="md" />
          </div>
          <div
            className="p-2"
            style={{
              background: "var(--bg-surface-2)",
              borderRadius: "5px",
            }}
          >
            <ScoreDisplay value={68} label="Iran Stability" size="md" />
          </div>
        </div>

        <SectionDivider title="Sample Progress" />

        <div style={{ maxWidth: "300px" }} className="mt-2 space-y-3">
          <div>
            <div
              className="flex justify-between mb-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
              }}
            >
              <span>Regime Change</span>
              <span style={{ color: "var(--status-critical)" }}>15%</span>
            </div>
            <ProgressBar value={15} color="var(--status-critical)" />
          </div>
          <div>
            <div
              className="flex justify-between mb-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
              }}
            >
              <span>Neutralize Nuclear</span>
              <span style={{ color: "var(--gold)" }}>35%</span>
            </div>
            <ProgressBar value={35} color="var(--gold)" />
          </div>
          <div>
            <div
              className="flex justify-between mb-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
              }}
            >
              <span>Iran Regime Stability</span>
              <span style={{ color: "var(--status-stable)" }}>68%</span>
            </div>
            <ProgressBar value={68} color="var(--status-stable)" />
          </div>
        </div>

        <SectionDivider title="Actions" />

        <div className="flex gap-3 mt-2">
          <Button variant="primary">Launch Simulation</Button>
          <Button variant="ghost">Browse Scenarios</Button>
        </div>

        {/* Chronicle sample */}
        <SectionDivider
          title="Intel Brief"
          subtitle="Turn 03 // 15 March 2026 // Severity: Major"
        />

        <div
          className="mt-2"
          style={{
            borderLeft: "2px solid var(--gold)",
            paddingLeft: "12px",
            maxWidth: "600px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "var(--text-tertiary)",
              letterSpacing: "0.04em",
              marginBottom: "6px",
            }}
          >
            15 MAR 2026 // 14:32 UTC
          </div>
          <div
            style={{
              fontFamily: "var(--font-condensed)",
              fontWeight: 700,
              fontSize: "15px",
              color: "var(--text-primary)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            The Oil War Escalates
          </div>
          <div className="prose-chronicle">
            Frustrated by the Strait closure, <strong>US and Israeli</strong>{" "}
            forces pivoted to economic warfare, striking Iran&rsquo;s oil export
            infrastructure &mdash; Kharg Island terminal, refineries near
            Abadan. <strong>Iran</strong> responded in kind with devastating
            precision. Ballistic missiles struck the{" "}
            <strong>Ras Tanura</strong> complex in Saudi Arabia. The message was
            unmistakable: if Iran&rsquo;s oil burned, so would everyone
            else&rsquo;s.
          </div>
          <div className="flex gap-1.5 mt-3">
            <Badge variant="critical">Gulf Infrastructure</Badge>
            <Badge variant="military">Ras Tanura Hit</Badge>
            <Badge variant="warning">Oil $142/bbl</Badge>
          </div>
        </div>
      </main>
    </>
  );
}
