import { EscalationLadder } from './EscalationLadder'

type ActorStatus = 'stable' | 'escalating' | 'critical'

interface ActorMetric {
  label: string
  value: string
}

interface ActorCardActor {
  id: string
  name: string
  escalationRung: number
  status: ActorStatus
  metrics?: ActorMetric[]
  description?: string
}

interface Props {
  actor: ActorCardActor
  onViewDossier?: () => void
}

const STATUS_CONFIG: Record<ActorStatus, { label: string; color: string; bg: string }> = {
  stable:     { label: 'Stable',     color: 'var(--status-stable)',    bg: 'var(--status-stable-bg)' },
  escalating: { label: 'Escalating', color: 'var(--status-warning)',   bg: 'var(--status-warning-bg)' },
  critical:   { label: 'Critical',   color: 'var(--status-critical)',  bg: 'var(--status-critical-bg)' },
}

export function ActorCard({ actor, onViewDossier }: Props) {
  const status = STATUS_CONFIG[actor.status]

  return (
    <div
      className="flex flex-col gap-3 p-3"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-label text-[13px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {actor.name}
        </span>
        <span
          className="font-label text-[9px] font-medium px-[7px] py-[2px]"
          style={{
            color: status.color,
            background: status.bg,
            border: `1px solid ${status.color}33`,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Description */}
      {actor.description && (
        <p
          className="font-sans text-[11px] leading-[1.5]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {actor.description}
        </p>
      )}

      {/* Escalation ladder */}
      <EscalationLadder currentRung={actor.escalationRung} />

      {/* Metrics */}
      {actor.metrics && actor.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {actor.metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col gap-[3px] p-[7px_9px]"
              style={{ background: 'var(--bg-surface-high)' }}
            >
              <span
                className="font-mono text-[9px] uppercase"
                style={{ color: 'var(--text-tertiary)', letterSpacing: '0.03em' }}
              >
                {metric.label}
              </span>
              <span
                className="font-mono text-[15px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <button
        onClick={onViewDossier}
        className="w-full py-2 font-label text-[11px] font-semibold uppercase tracking-[0.03em] transition-opacity hover:opacity-[0.88]"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-hi)',
          color: 'var(--text-secondary)',
        }}
      >
        View Dossier
      </button>
    </div>
  )
}
