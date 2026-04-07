// tests/scripts/compute-state-snapshots.test.ts
import { describe, it, expect } from "vitest"
import {
  daysBetween,
  applyDailyDepletion,
  applyActorDeltas,
  buildInitialInventory,
  buildInitialFacilityStatuses,
  computeSnapshots,
  computeInterceptorEffectiveness,
  type ActorDeltaWithId,
} from "../../scripts/compute-state-snapshots"
import type {
  ActorStateDelta,
  ActorStateSnapshot,
  GapFillData,
  EnrichedEvent,
  EventStateEffects,
  ActorProfile,
  RadarInstallation,
} from "../../scripts/pipeline/types"

// ─── daysBetween ─────────────────────────────────────────────────────────────

describe("daysBetween", () => {
  it("returns correct integer day count", () => {
    expect(daysBetween("2026-02-28T00:00:00Z", "2026-03-07T00:00:00Z")).toBe(7)
  })

  it("returns 0 for identical timestamps", () => {
    expect(daysBetween("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z")).toBe(0)
  })

  it("returns fractional days for partial days", () => {
    const result = daysBetween("2026-01-01T00:00:00Z", "2026-01-01T12:00:00Z")
    expect(result).toBeCloseTo(0.5, 5)
  })

  it("returns 1 for exactly 24 hours", () => {
    expect(daysBetween("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z")).toBe(1)
  })

  it("handles dates without time component (YYYY-MM-DD)", () => {
    const result = daysBetween("2026-01-01", "2026-01-08")
    expect(result).toBe(7)
  })
})

// ─── applyDailyDepletion ─────────────────────────────────────────────────────

describe("applyDailyDepletion", () => {
  it("applies basic consumption over days", () => {
    const result = applyDailyDepletion({ tomahawk: 100 }, { tomahawk: -10 }, 3)
    expect(result.tomahawk).toBe(70)
  })

  it("floors asset at 0 — cannot go negative", () => {
    const result = applyDailyDepletion({ missiles: 5 }, { missiles: -10 }, 3)
    expect(result.missiles).toBe(0)
  })

  it("does not mutate the input inventory", () => {
    const inventory = { tomahawk: 100 }
    applyDailyDepletion(inventory, { tomahawk: -10 }, 3)
    expect(inventory.tomahawk).toBe(100)
  })

  it("zero days produces no change", () => {
    const result = applyDailyDepletion({ tomahawk: 100 }, { tomahawk: -10 }, 0)
    expect(result.tomahawk).toBe(100)
  })

  it("leaves assets without a rate entry unchanged", () => {
    const result = applyDailyDepletion({ tomahawk: 100, fuel: 500 }, { tomahawk: -10 }, 1)
    expect(result.tomahawk).toBe(90)
    expect(result.fuel).toBe(500)
  })

  it("handles positive rates (replenishment)", () => {
    const result = applyDailyDepletion({ ammo: 50 }, { ammo: 5 }, 2)
    expect(result.ammo).toBe(60)
  })
})

// ─── applyActorDeltas ─────────────────────────────────────────────────────────

describe("applyActorDeltas", () => {
  const makeSnapshot = (overrides: Partial<ActorStateSnapshot> = {}): ActorStateSnapshot => ({
    actor_id: "united_states",
    military_strength: 80,
    political_stability: 70,
    economic_health: 75,
    public_support: 60,
    international_standing: 65,
    asset_inventory: {},
    ...overrides,
  })

  const makeDelta = (overrides: Partial<ActorStateDelta> = {}): ActorStateDelta => ({
    military_strength: 0,
    political_stability: 0,
    economic_health: 0,
    public_support: 0,
    international_standing: 0,
    rationale: "test",
    ...overrides,
  })

  it("applies deltas correctly", () => {
    const snapshots = { united_states: makeSnapshot() }
    const result = applyActorDeltas(
      snapshots,
      [{ actor_id: "united_states", ...makeDelta({ military_strength: -5, public_support: 3 }) }] as ActorDeltaWithId[],
      "evt_1"
    )
    expect(result.united_states.military_strength).toBe(75)
    expect(result.united_states.public_support).toBe(63)
  })

  it("clamps values at 100 (upper bound)", () => {
    const snapshots = { iran: makeSnapshot({ actor_id: "iran", military_strength: 95 }) }
    const result = applyActorDeltas(
      snapshots,
      [{ actor_id: "iran", ...makeDelta({ military_strength: 10 }) }] as ActorDeltaWithId[],
      "evt_2"
    )
    expect(result.iran.military_strength).toBe(100)
  })

  it("clamps values at 0 (lower bound)", () => {
    const snapshots = { iran: makeSnapshot({ actor_id: "iran", military_strength: 3 }) }
    const result = applyActorDeltas(
      snapshots,
      [{ actor_id: "iran", ...makeDelta({ military_strength: -10 }) }] as ActorDeltaWithId[],
      "evt_3"
    )
    expect(result.iran.military_strength).toBe(0)
  })

  it("initializes new actors at 50 before applying delta", () => {
    const result = applyActorDeltas(
      {},
      [{ actor_id: "china", ...makeDelta({ economic_health: 5 }) }] as ActorDeltaWithId[],
      "evt_4"
    )
    expect(result.china.military_strength).toBe(50)
    expect(result.china.economic_health).toBe(55)
  })

  it("does not mutate the input snapshots", () => {
    const snapshots = { united_states: makeSnapshot() }
    const original = snapshots.united_states.military_strength
    applyActorDeltas(
      snapshots,
      [{ actor_id: "united_states", ...makeDelta({ military_strength: -20 }) }] as ActorDeltaWithId[],
      "evt_5"
    )
    expect(snapshots.united_states.military_strength).toBe(original)
  })
})

// ─── buildInitialInventory ───────────────────────────────────────────────────

describe("buildInitialInventory", () => {
  const makeGapFill = (): GapFillData => ({
    as_of_date: "2026-01-01",
    sources_summary: "",
    asset_inventory: {
      united_states: {
        tomahawk: { estimated_remaining: 3000, unit: "missiles", confidence: "high", notes: "" },
        f35: { estimated_remaining: 450, unit: "aircraft", confidence: "medium", notes: "" },
        b2: { estimated_remaining: 20, unit: "aircraft", confidence: "low", notes: "classified" },
      },
      iran: {
        shahab3: { estimated_remaining: 200, unit: "missiles", confidence: "medium", notes: "" },
      },
    },
    depletion_rates: {},
    infrastructure_status: [],
    global_variable_timeline: [],
    casualties: {},
    political_indicators: {
      us_approval_pct: 55,
      us_congressional_status: "divided",
      iran_domestic_status: "stable",
      nato_cohesion: "intact",
      as_of_date: "2026-01-01",
    },
  })

  it("includes high confidence assets", () => {
    const result = buildInitialInventory(makeGapFill())
    expect(result.united_states.tomahawk).toBe(3000)
  })

  it("includes medium confidence assets", () => {
    const result = buildInitialInventory(makeGapFill())
    expect(result.united_states.f35).toBe(450)
  })

  it("excludes low confidence assets", () => {
    const result = buildInitialInventory(makeGapFill())
    expect(result.united_states.b2).toBeUndefined()
  })

  it("handles multiple actors", () => {
    const result = buildInitialInventory(makeGapFill())
    expect(result.iran.shahab3).toBe(200)
  })
})

// ─── buildInitialFacilityStatuses ─────────────────────────────────────────────

describe("buildInitialFacilityStatuses", () => {
  it("returns infrastructure_status as-is", () => {
    const facilities = [
      {
        facility_id: "natanz",
        name: "Natanz",
        actor_id: "iran",
        facility_type: "nuclear" as const,
        status: "operational" as const,
        capacity_pct: 100,
        lat: 33.7,
        lng: 51.7,
        notes: "",
      },
    ]
    const gapFill = {
      as_of_date: "2026-01-01",
      sources_summary: "",
      asset_inventory: {},
      depletion_rates: {},
      infrastructure_status: facilities,
      global_variable_timeline: [],
      casualties: {},
      political_indicators: {
        us_approval_pct: 55,
        us_congressional_status: "divided",
        iran_domestic_status: "stable",
        nato_cohesion: "intact",
        as_of_date: "2026-01-01",
      },
    } as GapFillData
    const result = buildInitialFacilityStatuses(gapFill)
    expect(result).toEqual(facilities)
    expect(result).toBe(gapFill.infrastructure_status) // same reference
  })
})

// ─── computeSnapshots ─────────────────────────────────────────────────────────

function makeMinimalEvent(overrides: Partial<EnrichedEvent> = {}): EnrichedEvent {
  return {
    id: "evt_001",
    timestamp: "2026-01-01T00:00:00Z",
    timestamp_confidence: "exact",
    title: "Test Event",
    description: "A test event",
    actors_involved: ["united_states", "iran"],
    dimension: "military",
    is_decision: false,
    escalation_direction: "up",
    source_excerpt: "",
    full_briefing: { situation: "", actor_perspectives: {}, context: "" },
    chronicle: { headline: "", date_label: "", entry: "" },
    context_summary: "",
    decision_analysis: { is_decision_point: false },
    escalation: {
      by_actor: {},
      perceived: {},
      dyads: {},
      global_ceiling: 0,
      direction: "none",
    },
    ...overrides,
  }
}

function makeMinimalEffects(eventId: string, overrides: Partial<EventStateEffects> = {}): EventStateEffects {
  return {
    event_id: eventId,
    timestamp: "2026-01-01T00:00:00Z",
    is_decision_revised: false,
    actor_deltas: {},
    asset_changes: [],
    global_updates: {},
    depletion_rate_changes: [],
    decision_nodes: [],
    confidence: "medium",
    ...overrides,
  }
}

const minimalGapFill: GapFillData = {
  as_of_date: "2026-01-01",
  sources_summary: "",
  asset_inventory: {},
  depletion_rates: {},
  infrastructure_status: [],
  global_variable_timeline: [],
  casualties: {},
  political_indicators: {
    us_approval_pct: 55,
    us_congressional_status: "divided",
    iran_domestic_status: "stable",
    nato_cohesion: "intact",
    as_of_date: "2026-01-01",
  },
}

describe("computeSnapshots", () => {
  it("returns one snapshot per event", () => {
    const events = [
      makeMinimalEvent({ id: "evt_001" }),
      makeMinimalEvent({ id: "evt_002", timestamp: "2026-01-02T00:00:00Z" }),
    ]
    const effects = [makeMinimalEffects("evt_001"), makeMinimalEffects("evt_002")]
    const result = computeSnapshots(events, effects, minimalGapFill)
    expect(result).toHaveLength(2)
  })

  it("snapshot event_id matches the event", () => {
    const events = [makeMinimalEvent({ id: "evt_001" })]
    const effects = [makeMinimalEffects("evt_001")]
    const result = computeSnapshots(events, effects, minimalGapFill)
    expect(result[0].event_id).toBe("evt_001")
  })

  it("all 5 actors are initialized at 50 when no actor profiles provided", () => {
    const events = [makeMinimalEvent()]
    const effects = [makeMinimalEffects("evt_001")]
    const result = computeSnapshots(events, effects, minimalGapFill)
    const actors = result[0].actor_states
    for (const actorId of ["united_states", "iran", "israel", "russia", "china"]) {
      expect(actors[actorId]).toBeDefined()
      expect(actors[actorId].military_strength).toBe(50)
      expect(actors[actorId].economic_health).toBe(50)
    }
  })

  it("uses actor profile initial scores when provided", () => {
    const events = [makeMinimalEvent()]
    const effects = [makeMinimalEffects("evt_001")]
    const actorProfiles: ActorProfile[] = [
      {
        id: "united_states",
        name: "United States",
        short_name: "USA",
        biographical_summary: "",
        leadership_profile: "",
        win_condition: "",
        strategic_doctrine: "",
        historical_precedents: "",
        initial_scores: {
          militaryStrength: 88,
          politicalStability: 52,
          economicHealth: 64,
          publicSupport: 31,
          internationalStanding: 55,
          escalationRung: 8,
          escalationLevel: 3,
          escalationLevelName: "Limited Overt Military Operations",
        },
        intelligence_profile: {
          signalCapability: 97,
          humanCapability: 82,
          cyberCapability: 95,
          blindSpots: [],
          intelSharingPartners: [],
        },
      },
      {
        id: "iran",
        name: "Iran",
        short_name: "Iran",
        biographical_summary: "",
        leadership_profile: "",
        win_condition: "",
        strategic_doctrine: "",
        historical_precedents: "",
        initial_scores: {
          militaryStrength: 52,
          politicalStability: 28,
          economicHealth: 18,
          publicSupport: 22,
          internationalStanding: 31,
          escalationRung: 11,
          escalationLevel: 4,
          escalationLevelName: "Broad Overt Military Operations",
        },
        intelligence_profile: {
          signalCapability: 41,
          humanCapability: 58,
          cyberCapability: 45,
          blindSpots: [],
          intelSharingPartners: [],
        },
      },
    ]
    const result = computeSnapshots(events, effects, minimalGapFill, actorProfiles)
    expect(result[0].actor_states.united_states.military_strength).toBe(88)
    expect(result[0].actor_states.united_states.economic_health).toBe(64)
    expect(result[0].actor_states.iran.military_strength).toBe(52)
    expect(result[0].actor_states.iran.political_stability).toBe(28)
    // Actors without a profile fall back to 50
    expect(result[0].actor_states.israel.military_strength).toBe(50)
    expect(result[0].actor_states.russia.economic_health).toBe(50)
  })

  it("applies actor_deltas to snapshot", () => {
    const events = [makeMinimalEvent()]
    const effects = [
      makeMinimalEffects("evt_001", {
        actor_deltas: {
          iran: {
            military_strength: -10,
            political_stability: 0,
            economic_health: -5,
            public_support: 0,
            international_standing: 0,
            rationale: "strike damage",
          },
        },
      }),
    ]
    const result = computeSnapshots(events, effects, minimalGapFill)
    expect(result[0].actor_states.iran.military_strength).toBe(40)
    expect(result[0].actor_states.iran.economic_health).toBe(45)
  })

  it("applies global_updates from effects", () => {
    const events = [makeMinimalEvent()]
    const effects = [
      makeMinimalEffects("evt_001", {
        global_updates: { oil_price_usd: 120, hormuz_throughput_pct: 60 },
      }),
    ]
    const result = computeSnapshots(events, effects, minimalGapFill)
    expect(result[0].global_state.oil_price_usd).toBe(120)
    expect(result[0].global_state.hormuz_throughput_pct).toBe(60)
  })

  it("carries state forward between events", () => {
    const events = [
      makeMinimalEvent({ id: "evt_001", timestamp: "2026-01-01T00:00:00Z" }),
      makeMinimalEvent({ id: "evt_002", timestamp: "2026-01-02T00:00:00Z" }),
    ]
    const effects = [
      makeMinimalEffects("evt_001", {
        actor_deltas: {
          iran: {
            military_strength: -10,
            political_stability: 0,
            economic_health: 0,
            public_support: 0,
            international_standing: 0,
            rationale: "first strike",
          },
        },
      }),
      makeMinimalEffects("evt_002"),
    ]
    const result = computeSnapshots(events, effects, minimalGapFill)
    // Second snapshot carries forward the degraded military_strength
    expect(result[1].actor_states.iran.military_strength).toBe(40)
  })

  it("handles missing effects for an event gracefully (uses zero deltas)", () => {
    const events = [makeMinimalEvent({ id: "evt_001" })]
    const result = computeSnapshots(events, [], minimalGapFill) // no effects at all
    expect(result).toHaveLength(1)
    expect(result[0].actor_states.united_states.military_strength).toBe(50)
  })

  it("applies asset_changes to inventory", () => {
    const gapFill: GapFillData = {
      ...minimalGapFill,
      asset_inventory: {
        iran: {
          missiles: { estimated_remaining: 200, unit: "missiles", confidence: "high", notes: "" },
        },
      },
    }
    const events = [makeMinimalEvent()]
    const effects = [
      makeMinimalEffects("evt_001", {
        asset_changes: [
          { actor_id: "iran", asset_type: "missiles", quantity_delta: -50, notes: "destroyed in strike" },
        ],
      }),
    ]
    const result = computeSnapshots(events, effects, gapFill)
    expect(result[0].actor_states.iran.asset_inventory.missiles).toBe(150)
  })
})

// ─── computeInterceptorEffectiveness ─────────────────────────────────────────

function makeRadar(overrides: Partial<RadarInstallation> = {}): RadarInstallation {
  return {
    id: "test_radar",
    name: "Test Radar",
    actor_id: "united_states",
    lat: 30.0,
    lon: 40.0,
    range_km: 1000,
    sectors_covered: ["test_sector"],
    supported_interceptors: ["thaad"],
    effectiveness_contribution: 0.40,
    baseline_status: "operational",
    current_status: "operational",
    status_effective_date: null,
    leaker_rate_increase_pct: 25.0,
    coverage_category: "critical",
    ...overrides,
  }
}

describe("computeInterceptorEffectiveness", () => {
  it("all radars operational → all sectors at 1.0", () => {
    const radars = [
      makeRadar({ id: "r1", sectors_covered: ["sector_a", "sector_b"], current_status: "operational" }),
      makeRadar({ id: "r2", sectors_covered: ["sector_c"], current_status: "operational" }),
    ]
    const result = computeInterceptorEffectiveness(radars, "2026-04-07")
    expect(result.united_states.sector_a).toBe(1.0)
    expect(result.united_states.sector_b).toBe(1.0)
    expect(result.united_states.sector_c).toBe(1.0)
  })

  it("one destroyed radar → affected sectors below 1.0", () => {
    const radars = [
      makeRadar({
        id: "r1",
        sectors_covered: ["sector_a"],
        current_status: "destroyed",
        status_effective_date: "2026-03-01",
        leaker_rate_increase_pct: 25.0,
        effectiveness_contribution: 0.40,
      }),
    ]
    const result = computeInterceptorEffectiveness(radars, "2026-04-07")
    // reduction = (25/100) * 0.40 * 1.0 (destroyed = 100%) = 0.10
    expect(result.united_states.sector_a).toBeCloseTo(0.90, 5)
  })

  it("degraded radar applies 50% of penalty", () => {
    const radars = [
      makeRadar({
        id: "r1",
        sectors_covered: ["sector_a"],
        current_status: "degraded",
        status_effective_date: "2026-03-01",
        leaker_rate_increase_pct: 25.0,
        effectiveness_contribution: 0.40,
      }),
    ]
    const result = computeInterceptorEffectiveness(radars, "2026-04-07")
    // reduction = (25/100) * 0.40 * 0.5 (degraded = 50%) = 0.05
    expect(result.united_states.sector_a).toBeCloseTo(0.95, 5)
  })

  it("date before status_effective_date → radar still counts as operational", () => {
    const radars = [
      makeRadar({
        id: "r1",
        sectors_covered: ["sector_a"],
        current_status: "destroyed",
        status_effective_date: "2026-03-15",
        leaker_rate_increase_pct: 25.0,
        effectiveness_contribution: 0.40,
      }),
    ]
    // Query date is BEFORE the effective date — should still be 1.0
    const result = computeInterceptorEffectiveness(radars, "2026-03-01")
    expect(result.united_states.sector_a).toBe(1.0)
  })

  it("date equal to status_effective_date → degradation applied", () => {
    const radars = [
      makeRadar({
        id: "r1",
        sectors_covered: ["sector_a"],
        current_status: "destroyed",
        status_effective_date: "2026-03-15",
        leaker_rate_increase_pct: 25.0,
        effectiveness_contribution: 0.40,
      }),
    ]
    // On the exact effective date, degradation should be applied
    const result = computeInterceptorEffectiveness(radars, "2026-03-15")
    expect(result.united_states.sector_a).toBeCloseTo(0.90, 5)
  })

  it("effectiveness is clamped at 0.01 minimum when multiple losses stack", () => {
    // Create many destroyed radars covering the same sector with large penalties
    const radars = Array.from({ length: 20 }, (_, i) =>
      makeRadar({
        id: `r${i}`,
        sectors_covered: ["critical_sector"],
        current_status: "destroyed",
        status_effective_date: "2026-03-01",
        leaker_rate_increase_pct: 50.0,
        effectiveness_contribution: 0.50,
      })
    )
    const result = computeInterceptorEffectiveness(radars, "2026-04-07")
    expect(result.united_states.critical_sector).toBeGreaterThanOrEqual(0.01)
  })

  it("different actors are tracked independently", () => {
    const radars = [
      makeRadar({
        id: "us_r1",
        actor_id: "united_states",
        sectors_covered: ["shared_sector"],
        current_status: "destroyed",
        status_effective_date: "2026-03-01",
        leaker_rate_increase_pct: 25.0,
        effectiveness_contribution: 0.40,
      }),
      makeRadar({
        id: "iran_r1",
        actor_id: "iran",
        sectors_covered: ["shared_sector"],
        current_status: "operational",
        status_effective_date: null,
        leaker_rate_increase_pct: 20.0,
        effectiveness_contribution: 0.30,
      }),
    ]
    const result = computeInterceptorEffectiveness(radars, "2026-04-07")
    // US sector should be degraded
    expect(result.united_states.shared_sector).toBeLessThan(1.0)
    // Iran sector should be at full effectiveness
    expect(result.iran.shared_sector).toBe(1.0)
  })

  it("snapshot includes interceptor_effectiveness when radars provided", () => {
    const radars = [
      makeRadar({
        id: "r1",
        actor_id: "united_states",
        sectors_covered: ["test_sector"],
        current_status: "destroyed",
        status_effective_date: "2026-01-01",
        leaker_rate_increase_pct: 20.0,
        effectiveness_contribution: 0.30,
      }),
    ]
    const events = [makeMinimalEvent()]
    const effects = [makeMinimalEffects("evt_001")]
    const result = computeSnapshots(events, effects, minimalGapFill, undefined, radars)
    expect(result[0].interceptor_effectiveness).toBeDefined()
    expect(result[0].interceptor_effectiveness.united_states).toBeDefined()
    expect(result[0].interceptor_effectiveness.united_states.test_sector).toBeLessThan(1.0)
  })

  it("interceptor_effectiveness is empty object when no radars provided", () => {
    const events = [makeMinimalEvent()]
    const effects = [makeMinimalEffects("evt_001")]
    const result = computeSnapshots(events, effects, minimalGapFill)
    expect(result[0].interceptor_effectiveness).toEqual({})
  })
})
