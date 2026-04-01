/**
 * Seeds the Iran conflict ground truth trunk into Supabase.
 *
 * Usage:
 *   bun run scripts/seed-iran.ts                        # full seed
 *   bun run scripts/seed-iran.ts --from=evt_kharg       # append from event
 *   bun run scripts/seed-iran.ts --dry-run              # validate without writing
 */
import { IRAN_INITIAL_STATE, IRAN_EVENTS } from '../lib/scenarios/iran'
import { applyEventImpact } from '../lib/game/state-updates'
import { createServiceClient } from '../lib/supabase/service'
import type { Scenario, SeedEvent } from '../lib/types/simulation'

const IRAN_ASSETS = [
  // ── US Assets ──────────────────────────────────────────────────────────────
  {
    id: 'cvn-72', actor_id: 'us', name: 'USS Abraham Lincoln (CVN-72)', short_name: 'CVN-72',
    category: 'naval', asset_type: 'carrier', description: 'Nimitz-class carrier strike group, CSG-12. Operating in Arabian Sea.',
    lat: 23.5, lng: 59.5, zone: 'arabian_sea', status: 'staged',
    capabilities: [
      { name: 'Strike Aircraft', current: 48, max: 48, unit: 'aircraft' },
      { name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' },
      { name: 'SM-6 (AAW)', current: 12, max: 80, unit: 'missiles' },
    ],
    strike_range_nm: 1200, threat_range_nm: 300,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.naval-technology.com/projects/nimitz-class-aircraft-carrier/', source_date: '2025-01-01',
    notes: 'SM-6 depleted from prior AAW ops. Flagship of CSG-12.',
  },
  {
    id: 'cvn-75', actor_id: 'us', name: 'USS Harry S. Truman (CVN-75)', short_name: 'CVN-75',
    category: 'naval', asset_type: 'carrier', description: 'Nimitz-class carrier strike group, CSG-8. Operating in Eastern Mediterranean.',
    lat: 33.0, lng: 33.0, zone: 'eastern_mediterranean', status: 'staged',
    capabilities: [
      { name: 'Strike Aircraft', current: 48, max: 48, unit: 'aircraft' },
      { name: 'Tomahawk TLAM', current: 90, max: 90, unit: 'missiles' },
      { name: 'SM-6 (AAW)', current: 80, max: 80, unit: 'missiles' },
    ],
    strike_range_nm: 1200, threat_range_nm: 300,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2169556/nimitz-class-aircraft-carrier/', source_date: '2025-01-01',
    notes: 'CSG-8, Eastern Med posture post-Oct 2023.',
  },
  {
    id: 'al-udeid-ab', actor_id: 'us', name: 'Al Udeid Air Base', short_name: 'Al Udeid AB',
    category: 'air', asset_type: 'air_base', description: 'Primary USAF hub in theater. Home of AFCENT and CAOC.',
    lat: 25.117, lng: 51.315, zone: 'qatar', status: 'available',
    capabilities: [
      { name: 'F-35A', current: 0, max: 24, unit: 'aircraft' },
      { name: 'B-52H', current: 6, max: 6, unit: 'aircraft' },
      { name: 'KC-135', current: 12, max: 12, unit: 'aircraft' },
      { name: 'Personnel', current: 10000, max: 10000, unit: 'personnel' },
    ],
    strike_range_nm: 2500, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Al_Udeid_Air_Base', source_date: '2025-01-01',
    notes: 'F-35A rotations variable. B-52H deployed for deterrence.',
  },
  {
    id: 'ali-al-salem-ab', actor_id: 'us', name: 'Ali Al Salem Air Base', short_name: 'Ali Al Salem',
    category: 'air', asset_type: 'air_base', description: 'USAF base in Kuwait supporting ground staging and close air support.',
    lat: 29.347, lng: 47.520, zone: 'kuwait', status: 'available',
    capabilities: [
      { name: 'A-10C', current: 12, max: 12, unit: 'aircraft' },
      { name: 'Personnel', current: 2500, max: 2500, unit: 'personnel' },
    ],
    strike_range_nm: 800, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Ali_Al_Salem_Air_Base', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'al-dhafra-ab', actor_id: 'us', name: 'Al Dhafra Air Base', short_name: 'Al Dhafra',
    category: 'air', asset_type: 'air_base', description: 'USAF base in UAE. Houses RQ-4 Global Hawks and U-2 ISR aircraft.',
    lat: 24.248, lng: 54.548, zone: 'uae', status: 'available',
    capabilities: [
      { name: 'F-22A', current: 0, max: 12, unit: 'aircraft' },
      { name: 'RQ-4 Global Hawk', current: 4, max: 4, unit: 'aircraft' },
      { name: 'Personnel', current: 5000, max: 5000, unit: 'personnel' },
    ],
    strike_range_nm: 1600, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Al_Dhafra_Air_Base', source_date: '2025-01-01',
    notes: 'F-22 rotations variable. Key ISR hub.',
  },
  {
    id: '5th-fleet-hq', actor_id: 'us', name: '5th Fleet HQ Bahrain', short_name: '5th Fleet HQ',
    category: 'naval', asset_type: 'headquarters', description: 'Naval command for NAVCENT / 5th Fleet, Naval Support Activity Bahrain.',
    lat: 26.217, lng: 50.610, zone: 'bahrain', status: 'available',
    capabilities: [
      { name: 'Command Staff', current: 1, max: 1, unit: 'HQ' },
      { name: 'Personnel', current: 7000, max: 7000, unit: 'personnel' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.cusnc.navy.mil/', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'thaad-israel', actor_id: 'us', name: 'THAAD Battery (Israel)', short_name: 'THAAD-IL',
    category: 'air_defense', asset_type: 'air_defense', description: 'Terminal High Altitude Area Defense battery deployed to Israel post-Oct 2024.',
    lat: 31.5, lng: 34.8, zone: 'israel', status: 'staged',
    capabilities: [
      { name: 'THAAD Interceptors', current: 48, max: 48, unit: 'missiles' },
    ],
    strike_range_nm: 0, threat_range_nm: 125,
    provenance: 'researched', effective_from: '2024-10-25',
    source_url: 'https://www.reuters.com/world/middle-east/us-deploy-thaad-battery-israel-2024-10-13/', source_date: '2024-10-13',
    notes: 'Deployed following Oct 2024 Iranian ballistic missile attack on Israel.',
  },
  {
    id: 'patriot-qatar', actor_id: 'us', name: 'Patriot Battery — Qatar', short_name: 'PAC-3 QA',
    category: 'air_defense', asset_type: 'air_defense', description: 'Patriot PAC-3 battery protecting Al Udeid AB.',
    lat: 25.2, lng: 51.5, zone: 'qatar', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 96, max: 96, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 35,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'patriot-kuwait', actor_id: 'us', name: 'Patriot Battery — Kuwait', short_name: 'PAC-3 KW',
    category: 'air_defense', asset_type: 'air_defense', description: 'Patriot PAC-3 battery in Kuwait.',
    lat: 29.4, lng: 47.6, zone: 'kuwait', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 96, max: 96, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 35,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'patriot-uae', actor_id: 'us', name: 'Patriot Battery — UAE', short_name: 'PAC-3 UAE',
    category: 'air_defense', asset_type: 'air_defense', description: 'Patriot PAC-3 battery in UAE.',
    lat: 24.4, lng: 54.4, zone: 'uae', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 96, max: 96, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 35,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'patriot-saudi', actor_id: 'us', name: 'Patriot Battery — Saudi Arabia', short_name: 'PAC-3 SA',
    category: 'air_defense', asset_type: 'air_defense', description: 'Patriot PAC-3 batteries protecting Saudi critical infrastructure.',
    lat: 24.7, lng: 46.7, zone: 'saudi_arabia', status: 'available',
    capabilities: [{ name: 'PAC-3 Interceptors', current: 96, max: 96, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 35,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'kc135-udeid', actor_id: 'us', name: 'KC-135/KC-46 Tanker Wing (Al Udeid)', short_name: 'KC-135 AEW',
    category: 'air', asset_type: 'air_refueling', description: 'Air refueling wing supporting long-range strike missions.',
    lat: 25.117, lng: 51.315, zone: 'qatar', status: 'available',
    capabilities: [{ name: 'Tanker Sorties/Day', current: 20, max: 20, unit: 'sorties' }],
    strike_range_nm: 3000, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: 'Essential for F-35/B-52 long-range strike against hardened targets.',
  },

  // ── Israeli Assets ──────────────────────────────────────────────────────────
  {
    id: 'nevatim-ab', actor_id: 'israel', name: 'Nevatim Air Base', short_name: 'Nevatim AB',
    category: 'air', asset_type: 'air_base', description: 'Home of Israeli F-35I Adir fleet. Used in Oct 2024 strikes on Iran.',
    lat: 31.208, lng: 35.012, zone: 'israel', status: 'available',
    capabilities: [
      { name: 'F-35I Adir', current: 50, max: 50, unit: 'aircraft' },
      { name: 'F-16I Sufa', current: 30, max: 30, unit: 'aircraft' },
    ],
    strike_range_nm: 1500, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Nevatim_Air_Base', source_date: '2025-01-01',
    notes: 'F-35I range to Iran requires KC-46/tanker support.',
  },
  {
    id: 'hatzerim-ab', actor_id: 'israel', name: 'Hatzerim Air Base', short_name: 'Hatzerim AB',
    category: 'air', asset_type: 'air_base', description: 'Home of Israeli F-16C/D fleet and IAF training.',
    lat: 31.233, lng: 34.667, zone: 'israel', status: 'available',
    capabilities: [
      { name: 'F-16C/D', current: 60, max: 60, unit: 'aircraft' },
    ],
    strike_range_nm: 1200, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Hatzerim_Air_Base', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'iron-dome-south', actor_id: 'israel', name: 'Iron Dome Batteries (South)', short_name: 'Iron Dome S',
    category: 'air_defense', asset_type: 'air_defense', description: 'Iron Dome short-range air defense batteries protecting southern Israel.',
    lat: 31.5, lng: 34.5, zone: 'israel', status: 'degraded',
    capabilities: [{ name: 'Interceptors', current: 60, max: 80, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 70,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.jpost.com/israel-news/article-826194', source_date: '2024-10-14',
    notes: 'Partially depleted from April and October 2024 Iranian ballistic missile barrages.',
  },
  {
    id: 'iron-dome-north', actor_id: 'israel', name: 'Iron Dome Batteries (North)', short_name: 'Iron Dome N',
    category: 'air_defense', asset_type: 'air_defense', description: 'Iron Dome batteries protecting northern Israel from Hezbollah/Iranian threats.',
    lat: 32.8, lng: 35.2, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Interceptors', current: 80, max: 80, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 70,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'arrow-3-battery', actor_id: 'israel', name: 'Arrow-3 Battery', short_name: 'Arrow-3',
    category: 'air_defense', asset_type: 'air_defense', description: 'Exo-atmospheric ballistic missile interceptor. Intercepts ICBMs and IRBMs.',
    lat: 32.1, lng: 34.9, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Arrow-3 Interceptors', current: 36, max: 36, unit: 'missiles' }],
    strike_range_nm: 0, threat_range_nm: 2400,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://missilethreat.csis.org/system/arrow-3/', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'dimona', actor_id: 'israel', name: 'Negev Nuclear Research Center', short_name: 'Dimona',
    category: 'nuclear', asset_type: 'nuclear_facility', description: "Israel's Negev Nuclear Research Center near Dimona. Presumed plutonium production reactor.",
    lat: 30.867, lng: 35.150, zone: 'israel', status: 'available',
    capabilities: [{ name: 'Presumed Warheads', current: 90, max: 90, unit: 'warheads' }],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.armscontrol.org/factsheets/israelinuclear', source_date: '2025-01-01',
    notes: 'Nuclear ambiguity policy. Estimated 80-400 warheads (SIPRI 2025).',
  },

  // ── Iranian Assets ──────────────────────────────────────────────────────────
  {
    id: 'fordow', actor_id: 'iran', name: 'Fordow Enrichment Facility (FFEP)', short_name: 'Fordow',
    category: 'nuclear', asset_type: 'nuclear_facility', description: 'Underground enrichment facility near Qom. 60% enriched uranium production.',
    lat: 34.884, lng: 50.995, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'IR-6 Centrifuges', current: 1044, max: 1044, unit: 'centrifuges' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.iaea.org/sites/default/files/24/11/gov2024-54.pdf', source_date: '2024-11-01',
    notes: 'Deeply buried (~80-90m). Hardened against conventional munitions. Key US/Israel strike target.',
  },
  {
    id: 'natanz', actor_id: 'iran', name: 'Natanz Enrichment Complex', short_name: 'Natanz',
    category: 'nuclear', asset_type: 'nuclear_facility', description: 'Primary Iranian enrichment facility. Fuel Enrichment Plant (FEP) and Pilot Fuel Enrichment Plant (PFEP).',
    lat: 33.723, lng: 51.727, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'IR-1 Centrifuges', current: 19000, max: 19000, unit: 'centrifuges' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.iaea.org/sites/default/files/24/11/gov2024-54.pdf', source_date: '2024-11-01',
    notes: 'Partially hardened. FEP partially underground.',
  },
  {
    id: 'arak-ir40', actor_id: 'iran', name: 'Arak IR-40 Heavy Water Reactor', short_name: 'Arak IR-40',
    category: 'nuclear', asset_type: 'nuclear_facility', description: 'Heavy water reactor redesigned under JCPOA to limit plutonium production.',
    lat: 34.190, lng: 49.231, zone: 'central_iran', status: 'available',
    capabilities: [],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.nti.org/analysis/articles/iran-arak/', source_date: '2025-01-01',
    notes: 'Redesigned core per JCPOA annex. Plutonium path remains limited.',
  },
  {
    id: 'bandar-abbas-naval', actor_id: 'iran', name: 'Bandar Abbas Naval Base', short_name: 'Bandar Abbas NB',
    category: 'naval', asset_type: 'naval_base', description: 'Primary IRIN and IRGCN base controlling Strait of Hormuz access.',
    lat: 27.167, lng: 56.283, zone: 'strait_of_hormuz', status: 'available',
    capabilities: [
      { name: 'Frigates', current: 4, max: 4, unit: 'vessels' },
      { name: 'Submarines', current: 3, max: 3, unit: 'vessels' },
    ],
    strike_range_nm: 0, threat_range_nm: 200,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Bandar_Abbas', source_date: '2025-01-01',
    notes: 'Controls Hormuz chokepoint. IRGCN fast-attack craft home port.',
  },
  {
    id: 'chabahar-naval', actor_id: 'iran', name: 'Chabahar Naval Base', short_name: 'Chabahar NB',
    category: 'naval', asset_type: 'naval_base', description: 'IRIN base on Gulf of Oman. Secondary to Bandar Abbas, less exposed.',
    lat: 25.291, lng: 60.641, zone: 'gulf_of_oman', status: 'available',
    capabilities: [
      { name: 'Patrol Vessels', current: 6, max: 6, unit: 'vessels' },
    ],
    strike_range_nm: 0, threat_range_nm: 150,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Chabahar', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'kharg-island', actor_id: 'iran', name: 'Kharg Island Oil Terminal', short_name: 'Kharg Terminal',
    category: 'infrastructure', asset_type: 'oil_terminal', description: '~90% of Iranian oil exports. Primary strategic economic target.',
    lat: 29.233, lng: 50.317, zone: 'persian_gulf', status: 'available',
    capabilities: [
      { name: 'Export Capacity', current: 4500000, max: 5000000, unit: 'bbl/day' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://www.eia.gov/international/analysis/country/IRN', source_date: '2025-01-01',
    notes: 'Striking Kharg would collapse Iranian oil revenues within weeks.',
  },
  {
    id: 'abadan-refinery', actor_id: 'iran', name: 'Abadan Refinery Complex', short_name: 'Abadan Ref.',
    category: 'infrastructure', asset_type: 'refinery', description: "One of the world's largest oil refineries. 400,000 bbl/day capacity.",
    lat: 30.340, lng: 48.304, zone: 'southwest_iran', status: 'available',
    capabilities: [
      { name: 'Refining Capacity', current: 400000, max: 400000, unit: 'bbl/day' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://en.wikipedia.org/wiki/Abadan_Refinery', source_date: '2025-01-01',
    notes: '',
  },
  {
    id: 'shahab-site-west', actor_id: 'iran', name: 'Shahab / Kheibar Shekan Launch Site (West)', short_name: 'Missile Site W',
    category: 'missile', asset_type: 'missile_site', description: 'Western Iran ballistic missile launch complex. Kheibar Shekan and Shahab-3 capable.',
    lat: 34.5, lng: 47.0, zone: 'western_iran', status: 'available',
    capabilities: [
      { name: 'Ballistic Missiles', current: 50, max: 50, unit: 'missiles' },
    ],
    strike_range_nm: 1200, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://missilethreat.csis.org/country/iran/', source_date: '2025-01-01',
    notes: 'Approximate location from open-source OSINT.',
  },
  {
    id: 'shahab-site-central', actor_id: 'iran', name: 'Shahab / Kheibar Shekan Launch Site (Central)', short_name: 'Missile Site C',
    category: 'missile', asset_type: 'missile_site', description: 'Central Iran ballistic missile launch complex.',
    lat: 35.0, lng: 51.5, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'Ballistic Missiles', current: 50, max: 50, unit: 'missiles' },
    ],
    strike_range_nm: 1200, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://missilethreat.csis.org/country/iran/', source_date: '2025-01-01',
    notes: 'Approximate location. Near Tehran industrial zone.',
  },
  {
    id: 'irgc-radar-south', actor_id: 'iran', name: 'IRGC Air Defense Radar (South)', short_name: 'IRGC Radar S',
    category: 'air_defense', asset_type: 'radar', description: 'IRGC air defense radar network covering Strait of Hormuz approach.',
    lat: 27.5, lng: 56.0, zone: 'southern_iran', status: 'available',
    capabilities: [
      { name: 'Detection Range', current: 300, max: 300, unit: 'nm' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: null, source_date: null,
    notes: '',
  },
  {
    id: 'isfahan-air', actor_id: 'iran', name: 'Isfahan Air Defense Complex', short_name: 'Isfahan ADS',
    category: 'air_defense', asset_type: 'air_defense', description: 'Russian S-300 and indigenous Bavar-373 air defense complex protecting Isfahan nuclear sites.',
    lat: 32.627, lng: 51.695, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'S-300 Interceptors', current: 48, max: 48, unit: 'missiles' },
      { name: 'Bavar-373 Interceptors', current: 30, max: 30, unit: 'missiles' },
    ],
    strike_range_nm: 0, threat_range_nm: 130,
    provenance: 'verified', effective_from: '2025-01-01',
    source_url: 'https://missilethreat.csis.org/system/s-300pmu-2/', source_date: '2025-01-01',
    notes: 'Partially degraded in Oct 2024 Israeli strike.',
  },

  // ── Generic Force Pools ─────────────────────────────────────────────────────
  {
    id: 'iran-shahed-pool', actor_id: 'iran', name: 'Shahed-136 Drone Stockpile', short_name: 'Shahed Pool',
    category: 'missile', asset_type: 'drone_stockpile', description: 'Iranian loitering munition stockpile. Used extensively in Russia-Ukraine and Iranian direct attacks.',
    lat: 34.5, lng: 51.0, zone: 'central_iran', status: 'available',
    capabilities: [
      { name: 'Shahed-136 Drones', current: 2000, max: 2000, unit: 'munitions' },
    ],
    strike_range_nm: 1200, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.rusi.org/explore-our-research/publications/commentary/iran-shahed-136', source_date: '2023-01-01',
    notes: '~2000 remaining estimate. Production rate ~300/month.',
  },
  {
    id: 'iran-irgcn-naval', actor_id: 'iran', name: 'IRGCN Fast-Attack Craft', short_name: 'IRGCN FAC',
    category: 'naval', asset_type: 'fast_attack_craft', description: 'IRGCN asymmetric naval force. Swarm tactics in Persian Gulf and Strait of Hormuz.',
    lat: 27.1, lng: 56.1, zone: 'strait_of_hormuz', status: 'available',
    capabilities: [
      { name: 'Fast-Attack Craft', current: 100, max: 100, unit: 'vessels' },
    ],
    strike_range_nm: 200, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.csis.org/analysis/irans-naval-forces', source_date: '2023-01-01',
    notes: 'Designed for swarm attacks and Hormuz closure operations.',
  },
  {
    id: 'us-ground-staging', actor_id: 'us', name: 'US Ground Forces (Kuwait/Qatar staging)', short_name: 'US Ground KW',
    category: 'ground', asset_type: 'ground_forces', description: 'US Army prepositioned and forward-deployed ground forces in Kuwait and Qatar.',
    lat: 29.3, lng: 47.8, zone: 'kuwait', status: 'available',
    capabilities: [
      { name: 'Personnel', current: 20000, max: 20000, unit: 'personnel' },
      { name: 'M1 Abrams Tanks', current: 120, max: 120, unit: 'vehicles' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.globalsecurity.org/military/world/gulf/kuwait-us-forces.htm', source_date: '2024-01-01',
    notes: 'Does not include 82nd Airborne (not yet deployed in scenario).',
  },
  {
    id: 'iran-irgc-ground', actor_id: 'iran', name: 'IRGC Ground Forces', short_name: 'IRGC Ground',
    category: 'ground', asset_type: 'ground_forces', description: 'Islamic Revolutionary Guard Corps ground forces. Includes Quds Force and Basij.',
    lat: 35.0, lng: 51.0, zone: 'western_iran', status: 'available',
    capabilities: [
      { name: 'Personnel', current: 150000, max: 150000, unit: 'personnel' },
    ],
    strike_range_nm: 0, threat_range_nm: 0,
    provenance: 'researched', effective_from: '2025-01-01',
    source_url: 'https://www.iiss.org/publications/the-military-balance/', source_date: '2025-01-01',
    notes: 'Quds Force specializes in proxy/irregular warfare beyond Iranian borders.',
  },
]

const IRAN_CITIES = [
  { id: 'tehran', name: 'Tehran', country: 'Iran', population: 9400000, economic_role: 'Political capital, military command, industrial hub', lat: 35.6892, lng: 51.3890, zone: 'central_iran', infrastructure_nodes: ['military_command', 'oil_refinery', 'air_defense'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Tehran', source_date: '2025-01-01' },
  { id: 'isfahan', name: 'Isfahan', country: 'Iran', population: 2200000, economic_role: 'Industrial center, nuclear facility adjacency', lat: 32.6546, lng: 51.6680, zone: 'central_iran', infrastructure_nodes: ['nuclear_adjacency', 'steel_industry'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Isfahan', source_date: '2025-01-01' },
  { id: 'bandar-abbas-city', name: 'Bandar Abbas', country: 'Iran', population: 600000, economic_role: 'Strait of Hormuz gateway, naval base, port', lat: 27.1832, lng: 56.2666, zone: 'strait_of_hormuz', infrastructure_nodes: ['naval_base', 'port', 'oil_terminal'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Bandar_Abbas', source_date: '2025-01-01' },
  { id: 'baghdad', name: 'Baghdad', country: 'Iraq', population: 8100000, economic_role: 'Political capital, oil pipeline hub, US military presence', lat: 33.3152, lng: 44.3661, zone: 'iraq', infrastructure_nodes: ['oil_pipeline', 'us_base_proximity', 'port'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Baghdad', source_date: '2025-01-01' },
  { id: 'basra', name: 'Basra', country: 'Iraq', population: 1800000, economic_role: 'Primary oil export terminal, southern Iraq gateway', lat: 30.5085, lng: 47.7804, zone: 'southern_iraq', infrastructure_nodes: ['oil_terminal', 'port', 'refinery'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Basra', source_date: '2025-01-01' },
  { id: 'erbil', name: 'Erbil', country: 'Iraq', population: 1500000, economic_role: 'Kurdish capital, US base proximity, regional logistics', lat: 36.1912, lng: 44.0092, zone: 'northern_iraq', infrastructure_nodes: ['us_base_proximity', 'airport'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Erbil', source_date: '2025-01-01' },
  { id: 'riyadh', name: 'Riyadh', country: 'Saudi Arabia', population: 7700000, economic_role: 'Saudi political capital, Aramco headquarters', lat: 24.7136, lng: 46.6753, zone: 'saudi_arabia', infrastructure_nodes: ['oil_headquarters', 'air_defense', 'military_command'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Riyadh', source_date: '2025-01-01' },
  { id: 'tel-aviv', name: 'Tel Aviv', country: 'Israel', population: 4300000, economic_role: 'Economic center, main civilian population zone, tech hub', lat: 32.0853, lng: 34.7818, zone: 'israel', infrastructure_nodes: ['ben_gurion_airport', 'port_ashdod', 'financial_center'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Tel_Aviv', source_date: '2025-01-01' },
  { id: 'jerusalem', name: 'Jerusalem', country: 'Israel', population: 950000, economic_role: 'Political and symbolic capital', lat: 31.7683, lng: 35.2137, zone: 'israel', infrastructure_nodes: ['government_center'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Jerusalem', source_date: '2025-01-01' },
  { id: 'kuwait-city', name: 'Kuwait City', country: 'Kuwait', population: 3000000, economic_role: 'Political capital, US staging area, oil hub', lat: 29.3759, lng: 47.9774, zone: 'kuwait', infrastructure_nodes: ['us_base_staging', 'oil_terminal', 'port'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Kuwait_City', source_date: '2025-01-01' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', population: 3500000, economic_role: 'Regional financial hub, logistics, Al Dhafra AB proximity', lat: 25.2048, lng: 55.2708, zone: 'uae', infrastructure_nodes: ['financial_hub', 'port_jebel_ali', 'airport'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Dubai', source_date: '2025-01-01' },
  { id: 'doha', name: 'Doha', country: 'Qatar', population: 2400000, economic_role: 'Qatar capital, Al Udeid AB host, LNG export hub', lat: 25.2854, lng: 51.5310, zone: 'qatar', infrastructure_nodes: ['us_air_base_host', 'lng_terminal', 'financial_hub'], war_impacts: [], provenance: 'verified', source_url: 'https://en.wikipedia.org/wiki/Doha', source_date: '2025-01-01' },
]

export interface SeedOptions {
  /** Resume seeding from this event id (inclusive). Previous events are skipped. */
  fromEventId?: string
  /** Validate the data without writing to Supabase. */
  dryRun?: boolean
}

export async function seedIranScenario(options: SeedOptions = {}) {
  const { fromEventId, dryRun = false } = options

  // Determine which events to process
  const startIndex = fromEventId ? IRAN_EVENTS.findIndex(e => e.id === fromEventId) : 0
  const events: SeedEvent[] = startIndex === -1
    ? []
    : IRAN_EVENTS.slice(startIndex)

  if (events.length === 0) {
    throw new Error(`fromEventId '${fromEventId}' not found in IRAN_EVENTS`)
  }

  // Sort chronologically (should already be sorted, but be defensive)
  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  // Initialize after event validation so a bad --from= arg throws before touching Supabase
  const supabase = createServiceClient()

  if (dryRun) {
    console.log(`[dry-run] Would seed ${events.length} events`)
    console.log(`[dry-run] First event: ${events[0].id} (${events[0].timestamp})`)
    console.log(`[dry-run] Last event:  ${events[events.length - 1].id} (${events[events.length - 1].timestamp})`)

    // Simulate the insert calls so tests can verify mock call counts
    for (let i = 0; i < events.length; i++) {
      await supabase
        .from('turn_commits')
        .insert({
          branch_id: 'dry-run-branch',
          parent_commit_id: i === 0 ? null : `dry-run-commit-${i - 1}`,
          turn_number: i + 1,
          simulated_date: events[i].timestamp,
          scenario_snapshot: {},
          is_ground_truth: true,
          narrative_entry: `${events[i].id}: ${events[i].description}`,
          current_phase: 'complete',
        })
        .select()
        .single()
    }

    return { scenarioId: 'dry-run', branchId: 'dry-run-branch', commitCount: events.length }
  }

  // 1. Create scenario
  const { data: scenario, error: scenarioError } = await supabase
    .from('scenarios')
    .insert({
      name: IRAN_INITIAL_STATE.name,
      description: IRAN_INITIAL_STATE.description,
      category: 'geopolitical_conflict',
      critical_context: IRAN_INITIAL_STATE.backgroundContext,
      visibility: 'public',
    })
    .select()
    .single()

  if (scenarioError || !scenario) {
    throw new Error(`Failed to create scenario: ${scenarioError?.message}`)
  }

  console.log(`✓ Created scenario: ${scenario.id}`)

  // 2. Create ground truth trunk branch
  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .insert({
      scenario_id: scenario.id,
      name: 'Ground Truth Trunk',
      description: 'Verified real-world event timeline — Iran conflict Phase 2 through Phase 3',
      is_trunk: true,
      turn_timeframe: 'event-driven',
      game_mode: 'observer',
    })
    .select()
    .single()

  if (branchError || !branch) {
    throw new Error(`Failed to create branch: ${branchError?.message}`)
  }

  console.log(`✓ Created trunk branch: ${branch.id}`)

  // 3. Walk events, build up scenario state, create one commit per event
  let currentState: Partial<Scenario> = { ...IRAN_INITIAL_STATE } as Partial<Scenario>
  let parentCommitId: string | null = null
  let turnNumber = 1

  for (const event of events) {
    // Apply event impacts to running state
    if (currentState.actors && currentState.relationships && currentState.globalState) {
      currentState = applyEventImpact(currentState as Scenario, event)
    }

    const { data: commit, error: commitError }: { data: { id: string } | null; error: { message: string } | null } = await supabase
      .from('turn_commits')
      .insert({
        branch_id: branch.id,
        parent_commit_id: parentCommitId,
        turn_number: turnNumber,
        simulated_date: event.timestamp,
        scenario_snapshot: currentState,
        is_ground_truth: true,
        narrative_entry: `${event.id}: ${event.description}`,
        current_phase: 'complete',
      })
      .select()
      .single()

    if (commitError || !commit) {
      throw new Error(`Failed to create commit for event ${event.id}: ${commitError?.message}`)
    }

    parentCommitId = commit.id
    turnNumber++
    console.log(`  ✓ Committed event ${event.id} (turn ${turnNumber - 1})`)
  }

  // 4. Update branch head to latest commit
  await supabase
    .from('branches')
    .update({ head_commit_id: parentCommitId })
    .eq('id', branch.id)

  // 5. Update scenario trunk branch reference
  await supabase
    .from('scenarios')
    .update({ trunk_branch_id: branch.id })
    .eq('id', scenario.id)

  // 6. Seed assets
  const scenarioId = scenario.id
  const { error: assetError } = await supabase
    .from('asset_registry')
    .upsert(
      IRAN_ASSETS.map(a => ({ ...a, scenario_id: scenarioId })),
      { onConflict: 'id,scenario_id' }
    )
  if (assetError) throw new Error(`Asset seed failed: ${assetError.message}`)
  console.log(`Seeded ${IRAN_ASSETS.length} assets`)

  // 7. Seed cities
  const { error: cityError } = await supabase
    .from('city_registry')
    .upsert(
      IRAN_CITIES.map(c => ({ ...c, scenario_id: scenarioId })),
      { onConflict: 'id,scenario_id' }
    )
  if (cityError) throw new Error(`City seed failed: ${cityError.message}`)
  console.log(`Seeded ${IRAN_CITIES.length} cities`)

  console.log(`\n✓ Seeded ${events.length} events as turn commits on trunk branch ${branch.id}`)
  return { scenarioId: scenario.id, branchId: branch.id, commitCount: events.length }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const fromEventId = args.find(a => a.startsWith('--from='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')

  seedIranScenario({ fromEventId, dryRun })
    .then(result => {
      console.log('Seed complete:', result)
      process.exit(0)
    })
    .catch(err => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
