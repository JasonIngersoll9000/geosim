/**
 * Static mock branch data for dev mode (NEXT_PUBLIC_DEV_MODE=true).
 * Used by both the branches API route (server) and the branches page (client)
 * so the UI can render without waiting for async fetches.
 */

export const DEV_TRUNK_COMMITS = [
  { id: 'dev-c-01', turn_number: 1,  simulated_date: '2025-04-01', chronicle_headline: 'US-Iran Nuclear Talks Begin, Mediated by Oman' },
  { id: 'dev-c-02', turn_number: 2,  simulated_date: '2025-06-13', chronicle_headline: 'Israel Launches Operation Rising Lion Against Iran' },
  { id: 'dev-c-03', turn_number: 3,  simulated_date: '2025-06-13', chronicle_headline: 'Iran Retaliates with Missiles and Drones Against Israel' },
  { id: 'dev-c-04', turn_number: 4,  simulated_date: '2025-06-21', chronicle_headline: 'US Launches Operation Midnight Hammer on Iranian Nuclear Sites' },
  { id: 'dev-c-05', turn_number: 5,  simulated_date: '2025-06-23', chronicle_headline: 'Trump Announces Ceasefire Ending the Twelve-Day War' },
  { id: 'dev-c-06', turn_number: 6,  simulated_date: '2025-07-01', chronicle_headline: 'Iran Expels IAEA Inspectors and Suspends Cooperation' },
  { id: 'dev-c-07', turn_number: 7,  simulated_date: '2025-08-01', chronicle_headline: 'Israel Kills 12 Houthi Cabinet Members in Targeted Strike' },
  { id: 'dev-c-08', turn_number: 8,  simulated_date: '2025-10-01', chronicle_headline: 'Iran Defense Officials Advocate for Nuclear Weapons Program' },
  { id: 'dev-c-09', turn_number: 9,  simulated_date: '2025-10-10', chronicle_headline: 'Gaza Ceasefire Takes Effect Under US Mediation' },
  { id: 'dev-c-10', turn_number: 10, simulated_date: '2026-01-01', chronicle_headline: "Iran's Mass Crackdown on Protesters — 150+ Dead" },
  { id: 'dev-c-11', turn_number: 11, simulated_date: '2026-01-15', chronicle_headline: 'Russia Delivers Advanced Air Defense Systems to Iran' },
  { id: 'dev-c-12', turn_number: 12, simulated_date: '2026-03-22', chronicle_headline: 'Iran Begins Uranium Enrichment at Undisclosed Facility' },
]

export const DEV_TRUNK_BRANCH = {
  id: 'dev-trunk',
  name: 'Ground Truth',
  is_trunk: true,
  status: 'active',
  head_commit_id: 'dev-c-12',
  fork_point_commit_id: null,
  created_at: '2025-04-01T00:00:00Z',
  parent_branch_id: null,
  turn_commits: DEV_TRUNK_COMMITS,
}

export const DEV_ACTORS = [
  { id: 'united_states', name: 'United States', short_name: 'US' },
  { id: 'iran',          name: 'Iran',          short_name: 'IRN' },
  { id: 'israel',        name: 'Israel',        short_name: 'ISR' },
  { id: 'russia',        name: 'Russia',        short_name: 'RUS' },
  { id: 'china',         name: 'China',         short_name: 'CHN' },
]

/**
 * Per-turn actor state snapshots for the dev trunk (12 turns).
 * escalationRung: 1 (peace) → 10 (full-scale war)
 * military / economic / political: 0–100
 */
export const DEV_ACTOR_SNAPSHOTS: Record<number, Array<{
  actorId: string; actorName: string
  escalationRung: number; military: number; economic: number; political: number
}>> = {
  1:  [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 3, military: 75, economic: 78, political: 68 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 3, military: 55, economic: 38, political: 52 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 4, military: 82, economic: 72, political: 65 },
  ],
  2:  [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 6, military: 78, economic: 76, political: 60 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 7, military: 62, economic: 35, political: 48 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 8, military: 88, economic: 68, political: 62 },
  ],
  3:  [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 7, military: 82, economic: 74, political: 55 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 8, military: 65, economic: 32, political: 44 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 8, military: 85, economic: 64, political: 58 },
  ],
  4:  [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 9, military: 88, economic: 70, political: 52 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 9, military: 45, economic: 28, political: 38 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 8, military: 82, economic: 62, political: 55 },
  ],
  5:  [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 4, military: 80, economic: 72, political: 58 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 4, military: 42, economic: 30, political: 40 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 4, military: 80, economic: 66, political: 60 },
  ],
  6:  [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 5, military: 78, economic: 72, political: 60 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 5, military: 44, economic: 28, political: 42 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 5, military: 80, economic: 64, political: 58 },
  ],
  7:  [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 6, military: 80, economic: 70, political: 58 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 6, military: 46, economic: 26, political: 40 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 7, military: 84, economic: 62, political: 55 },
  ],
  8:  [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 6, military: 80, economic: 70, political: 55 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 7, military: 48, economic: 25, political: 38 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 7, military: 84, economic: 60, political: 52 },
  ],
  9:  [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 4, military: 78, economic: 72, political: 60 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 5, military: 46, economic: 26, political: 40 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 4, military: 80, economic: 64, political: 58 },
  ],
  10: [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 5, military: 78, economic: 71, political: 58 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 5, military: 50, economic: 24, political: 35 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 5, military: 80, economic: 62, political: 56 },
  ],
  11: [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 6, military: 80, economic: 70, political: 56 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 6, military: 58, economic: 23, political: 38 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 6, military: 84, economic: 60, political: 54 },
  ],
  12: [
    { actorId: 'united_states', actorName: 'United States', escalationRung: 7, military: 82, economic: 68, political: 52 },
    { actorId: 'iran',          actorName: 'Iran',          escalationRung: 8, military: 62, economic: 22, political: 36 },
    { actorId: 'israel',        actorName: 'Israel',        escalationRung: 8, military: 86, economic: 58, political: 50 },
  ],
}
