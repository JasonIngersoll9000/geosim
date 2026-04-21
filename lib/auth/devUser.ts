export function getDevUser() {
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') return null
  return {
    id: 'dev-user',
    email: 'dev@wargame.local',
    role: 'admin' as const,
  }
}
