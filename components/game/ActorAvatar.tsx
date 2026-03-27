export function ActorAvatar({ actorId, name }: { actorId: string; name: string }) {
  const colorMap: Record<string, string> = {
    united_states: 'var(--actor-us)',
    iran: 'var(--actor-iran)',
    israel: 'var(--actor-israel)',
    russia: 'var(--actor-russia)',
  }
  const color = colorMap[actorId] ?? 'var(--actor-generic)'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-none flex items-center justify-center font-sans font-semibold text-[13px] flex-shrink-0"
      style={{ background: `${color}30`, color }}
    >
      {initials}
    </div>
  )
}
