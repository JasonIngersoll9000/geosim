// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  computeCompositeScore,
  scoreToRung,
  rungToLevel,
  scoreEscalation,
  MACRO_LEVELS,
  THRESHOLDS,
  ESCALATION_FRAMEWORK_PROMPT,
} from "../../scripts/pipeline/escalation-framework"
import type { EscalationCriteria } from "../../scripts/pipeline/escalation-framework"

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ZERO_CRITERIA: EscalationCriteria = {
  lethality: 0,
  attribution: 0,
  target_sensitivity: 0,
  geographic_scope: 0,
  reversibility: 0,
  norm_violation: 0,
}

const MAX_CRITERIA: EscalationCriteria = {
  lethality: 5,
  attribution: 4,
  target_sensitivity: 5,
  geographic_scope: 5,
  reversibility: 4,
  norm_violation: 4,
}

// A limited US precision strike on an Iranian airbase (non-core territory) —
// acknowledged, conventional, no WMD targets.
// lethality=2(dozens), attribution=3(acknowledged not triumphally claimed),
// target_sensitivity=1(mil infra), geographic_scope=2(non-core territory),
// reversibility=2(partially reversible), norm_violation=2(violates sovereignty, precedented)
const LIMITED_STRIKE_CRITERIA: EscalationCriteria = {
  lethality: 2,
  attribution: 3,
  target_sensitivity: 1,
  geographic_scope: 2,
  reversibility: 2,
  norm_violation: 2,
}
// Expected: (2/5)*100*0.22 + (3/4)*100*0.10 + (1/5)*100*0.22 +
//           (2/5)*100*0.15 + (2/4)*100*0.13 + (2/4)*100*0.18
//         = 8.8 + 7.5 + 4.4 + 6.0 + 6.5 + 9.0 = 42.2 → 42
const LIMITED_STRIKE_EXPECTED_SCORE = 42

// US strikes on Iranian nuclear facility (Fordow) —
// lethality=2, attribution=4, target_sensitivity=5(nuclear/WMD),
// geographic_scope=3(core territory), reversibility=3, norm_violation=3(major norm)
const NUCLEAR_FACILITY_STRIKE_CRITERIA: EscalationCriteria = {
  lethality: 2,
  attribution: 4,
  target_sensitivity: 5,
  geographic_scope: 3,
  reversibility: 3,
  norm_violation: 3,
}
// Expected: (2/5)*100*0.22 + (5/5)*100*0.22 + (3/4)*100*0.18 +
//           (3/5)*100*0.15 + (3/4)*100*0.13 + (4/4)*100*0.10
//         = 8.8 + 22.0 + 13.5 + 9.0 + 9.75 + 10.0 = 73.05 → 73
const NUCLEAR_FACILITY_EXPECTED_SCORE = 73

// ─────────────────────────────────────────────────────────────────────────────
// computeCompositeScore
// ─────────────────────────────────────────────────────────────────────────────

describe("computeCompositeScore", () => {
  it("returns 0 for all-zero criteria", () => {
    expect(computeCompositeScore(ZERO_CRITERIA)).toBe(0)
  })

  it("returns 100 for all-maximum criteria", () => {
    expect(computeCompositeScore(MAX_CRITERIA)).toBe(100)
  })

  it("weights sum to 1.0 (no score inflation or deflation)", () => {
    // If weights are correct, max criteria always yield exactly 100
    expect(computeCompositeScore(MAX_CRITERIA)).toBe(100)
  })

  it("computes correct score for a limited conventional strike", () => {
    expect(computeCompositeScore(LIMITED_STRIKE_CRITERIA)).toBe(LIMITED_STRIKE_EXPECTED_SCORE)
  })

  it("computes higher score for nuclear facility strike vs equivalent conventional", () => {
    // Nuclear facility strike (target_sensitivity=5) scores higher than
    // same strike on military infrastructure (target_sensitivity=1)
    expect(computeCompositeScore(NUCLEAR_FACILITY_STRIKE_CRITERIA))
      .toBeGreaterThan(computeCompositeScore(LIMITED_STRIKE_CRITERIA))
  })

  it("never exceeds 100", () => {
    expect(computeCompositeScore(MAX_CRITERIA)).toBeLessThanOrEqual(100)
  })

  it("never goes below 0", () => {
    expect(computeCompositeScore(ZERO_CRITERIA)).toBeGreaterThanOrEqual(0)
  })

  it("target_sensitivity and lethality are the highest-weighted criteria", () => {
    // Isolated test: same input but vary one criterion at a time
    const baseScore = computeCompositeScore(ZERO_CRITERIA)

    // Max out only lethality
    const lethalityScore = computeCompositeScore({ ...ZERO_CRITERIA, lethality: 5 })
    // Max out only norm_violation (lower weight)
    const normScore = computeCompositeScore({ ...ZERO_CRITERIA, norm_violation: 4 })

    // Lethality (weight 0.22, max 5) should contribute more than norm_violation (weight 0.18, max 4)
    expect(lethalityScore - baseScore).toBeGreaterThan(normScore - baseScore)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// scoreToRung
// ─────────────────────────────────────────────────────────────────────────────

describe("scoreToRung", () => {
  it("maps score 0 to rung 0", () => {
    expect(scoreToRung(0)).toBe(0)
  })

  it("maps score 100 to rung 20", () => {
    expect(scoreToRung(100)).toBe(20)
  })

  it("maps score 50 to rung 10", () => {
    expect(scoreToRung(50)).toBe(10)
  })

  it("maps score 25 to rung 5", () => {
    expect(scoreToRung(25)).toBe(5)
  })

  it("always returns an integer", () => {
    for (const score of [10, 33, 51, 72, 88]) {
      expect(Number.isInteger(scoreToRung(score))).toBe(true)
    }
  })

  it("returns rung within 0-20 range for any valid score", () => {
    for (let score = 0; score <= 100; score++) {
      const rung = scoreToRung(score)
      expect(rung).toBeGreaterThanOrEqual(0)
      expect(rung).toBeLessThanOrEqual(20)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// rungToLevel — boundary conditions are critical
// ─────────────────────────────────────────────────────────────────────────────

describe("rungToLevel", () => {
  const cases: [number, number, string][] = [
    [0,  0, "Baseline Competition"],
    [1,  0, "Baseline Competition"],
    [2,  1, "Crisis Onset"],
    [3,  1, "Crisis Onset"],
    [4,  2, "Covert / Deniable Operations"],
    [6,  2, "Covert / Deniable Operations"],
    [7,  3, "Limited Overt Military Operations"],
    [9,  3, "Limited Overt Military Operations"],
    [10, 4, "Major Conventional War"],
    [13, 4, "Major Conventional War"],
    [14, 5, "Strategic Escalation"],
    [16, 5, "Strategic Escalation"],
    [17, 6, "Limited Nuclear Use"],
    [18, 6, "Limited Nuclear Use"],
    [19, 7, "General Nuclear War"],
    [20, 7, "General Nuclear War"],
  ]

  it.each(cases)("rung %i → level %i (%s)", (rung, expectedLevel, expectedName) => {
    const level = rungToLevel(rung)
    expect(level.level).toBe(expectedLevel)
    expect(level.name).toBe(expectedName)
  })

  it("covers all rungs 0-20 without gaps", () => {
    for (let rung = 0; rung <= 20; rung++) {
      expect(() => rungToLevel(rung)).not.toThrow()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// scoreEscalation — end-to-end
// ─────────────────────────────────────────────────────────────────────────────

describe("scoreEscalation", () => {
  it("returns composite, rung, and level for zero criteria", () => {
    const result = scoreEscalation(ZERO_CRITERIA)
    expect(result.composite).toBe(0)
    expect(result.rung).toBe(0)
    expect(result.level.level).toBe(0)
  })

  it("returns composite, rung, and level for max criteria", () => {
    const result = scoreEscalation(MAX_CRITERIA)
    expect(result.composite).toBe(100)
    expect(result.rung).toBe(20)
    expect(result.level.level).toBe(7)
  })

  it("places a limited conventional strike at Level 3 (Limited Overt Military)", () => {
    // US precision strike on Iranian military infrastructure —
    // acknowledged, conventional, sovereign territory, no WMD
    const result = scoreEscalation(LIMITED_STRIKE_CRITERIA)
    expect(result.level.level).toBe(3)
    expect(result.level.name).toBe("Limited Overt Military Operations")
  })

  it("places a nuclear facility strike at Level 4-5 (Strategic Escalation)", () => {
    // US B-2 strikes on Fordow — nuclear facility, same conventional delivery
    // The key difference is target_sensitivity=5 (nuclear/WMD sites)
    const result = scoreEscalation(NUCLEAR_FACILITY_STRIKE_CRITERIA)
    expect(result.level.level).toBeGreaterThanOrEqual(4)
  })

  it("composite is consistent with rung (rung = round(composite/100 * 20))", () => {
    const result = scoreEscalation(LIMITED_STRIKE_CRITERIA)
    expect(result.rung).toBe(Math.round((result.composite / 100) * 20))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MACRO_LEVELS — structural integrity
// ─────────────────────────────────────────────────────────────────────────────

describe("MACRO_LEVELS", () => {
  it("has exactly 8 levels (0-7)", () => {
    expect(MACRO_LEVELS).toHaveLength(8)
  })

  it("levels are numbered 0-7 sequentially", () => {
    MACRO_LEVELS.forEach((level, i) => {
      expect(level.level).toBe(i)
    })
  })

  it("rung ranges cover 0-20 without gaps or overlaps", () => {
    const covered = new Set<number>()
    for (const level of MACRO_LEVELS) {
      for (let r = level.rung_range[0]; r <= level.rung_range[1]; r++) {
        expect(covered.has(r)).toBe(false) // no overlap
        covered.add(r)
      }
    }
    // All rungs 0-20 covered
    for (let r = 0; r <= 20; r++) {
      expect(covered.has(r)).toBe(true)
    }
  })

  it("each level has at least one characteristic action", () => {
    MACRO_LEVELS.forEach(level => {
      expect(level.characteristic_actions.length).toBeGreaterThan(0)
    })
  })

  it("escalation levels progress through glasl phases correctly", () => {
    // Win-win at low levels, win-lose in middle, lose-lose at high levels
    expect(MACRO_LEVELS[0].glasl_phase).toBe("win_win")
    expect(MACRO_LEVELS[3].glasl_phase).toBe("win_lose")
    expect(MACRO_LEVELS[7].glasl_phase).toBe("lose_lose")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS — structural integrity
// ─────────────────────────────────────────────────────────────────────────────

describe("THRESHOLDS", () => {
  it("has a threshold for every level transition 0→1 through 6→7", () => {
    for (let from = 0; from <= 6; from++) {
      const threshold = THRESHOLDS.find(t => t.from_level === from && t.to_level === from + 1)
      expect(threshold, `missing threshold ${from}→${from + 1}`).toBeDefined()
    }
  })

  it("each threshold has at least one crossing indicator", () => {
    THRESHOLDS.forEach(t => {
      expect(t.crossing_indicators.length).toBeGreaterThan(0)
    })
  })

  it("threshold IDs are unique", () => {
    const ids = THRESHOLDS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATION_FRAMEWORK_PROMPT — contract tests (not exact prose)
// ─────────────────────────────────────────────────────────────────────────────

describe("ESCALATION_FRAMEWORK_PROMPT", () => {
  it("includes the level scale reference", () => {
    expect(ESCALATION_FRAMEWORK_PROMPT).toContain("0-7")
    expect(ESCALATION_FRAMEWORK_PROMPT).toContain("0-20")
  })

  it("names all 6 scoring criteria", () => {
    expect(ESCALATION_FRAMEWORK_PROMPT).toContain("lethality")
    expect(ESCALATION_FRAMEWORK_PROMPT).toContain("attribution")
    expect(ESCALATION_FRAMEWORK_PROMPT).toContain("target_sensitivity")
    expect(ESCALATION_FRAMEWORK_PROMPT).toContain("geographic_scope")
    expect(ESCALATION_FRAMEWORK_PROMPT).toContain("reversibility")
    expect(ESCALATION_FRAMEWORK_PROMPT).toContain("norm_violation")
  })

  it("includes all 11 tracked dyads", () => {
    const dyads = [
      "us_iran", "us_israel", "israel_iran",
      "us_houthis", "iran_houthis", "us_hezbollah", "iran_hezbollah",
      "us_iraqi_militia", "iran_iraqi_militia", "us_russia", "us_china",
    ]
    dyads.forEach(dyad => {
      expect(ESCALATION_FRAMEWORK_PROMPT).toContain(dyad)
    })
  })

  it("includes all threshold IDs", () => {
    THRESHOLDS.forEach(t => {
      expect(ESCALATION_FRAMEWORK_PROMPT).toContain(t.id)
    })
  })

  it("includes the actor-perspective scoring rule", () => {
    // The critical instruction: score from actor's own doctrine perspective
    expect(ESCALATION_FRAMEWORK_PROMPT).toContain("THEIR strategic doctrine perspective")
  })

  it("matches snapshot (change-control gate — update intentionally)", () => {
    expect(ESCALATION_FRAMEWORK_PROMPT).toMatchSnapshot()
  })
})
