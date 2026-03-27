interface Props {
  isVisible: boolean
  onDismiss: () => void
}

export function ObserverOverlay({ isVisible, onDismiss }: Props) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80">
      <div className="bg-bg-surface border border-border-subtle px-8 py-6 max-w-md w-full">
        <div className="font-mono text-2xs uppercase tracking-[0.2em] text-gold mb-4 text-center">
          OBSERVER MODE
        </div>
        <p className="font-serif italic text-sm text-text-secondary leading-[1.75] text-center mb-4">
          You are observing this scenario. Actions are disabled.
        </p>
        <button
          onClick={onDismiss}
          className="w-full py-2 font-mono text-2xs uppercase tracking-[0.1em] text-text-primary bg-transparent border border-border-subtle hover:bg-bg-surface-high transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
