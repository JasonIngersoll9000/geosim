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
