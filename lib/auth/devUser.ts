export function getDevUser() {
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') return null
  return {
    id: 'dev-user',
    email: 'dev@geosim.local',
    role: 'admin' as const,
  }
}
