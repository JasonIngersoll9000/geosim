---
name: test-agent
description: Use when testing individual AI agents (actor agent, resolution engine, judge, or narrator) in isolation with mock scenario inputs to verify prompt quality, output structure, and neutrality before integration
---

## Description
Test a single GeoSim AI agent end-to-end using mock Iran scenario data,
without running the full game loop. Useful for iterating on prompts,
verifying output structure, and checking neutrality/bias.

## Prerequisites
- `ANTHROPIC_API_KEY` set in `.env.local`
- Dev server running: `bun run dev`
- Mock scenario data available in `tests/helpers/mock-scenario.ts`

## Which agent to test?

| Agent | Route | When to use |
|---|---|---|
| Actor agent | `POST /api/ai/actor-agent` | Decision generation, TurnPlan quality, fog-of-war correctness |
| Resolution engine | `POST /api/ai/resolution-engine` | Collision resolution, synergy/tension effects, event generation |
| Judge | `POST /api/ai/judge` | Score calibration, bias detection, retry loop behavior |
| Narrator | `POST /api/ai/narrator` | Chronicle prose quality, neutrality, entity naming balance |

---

## Steps

### 1. Prepare mock inputs

Use or extend `tests/helpers/mock-scenario.ts`. For the Iran scenario, key mock facts to preserve:
- US believes Iran military readiness = 25 (actual = 58)
- Iran escalation rung = 6, US = 5, Israel = 6
- Strait of Hormuz status = `"blocked"`
- US domestic support = 31%, AIPAC influence = 82
- Iran nuclear constraints: religious (removed), deterrence (removed) — breakout enabled

### 2. Call the agent directly

**Actor agent** (test fog-of-war + decision generation):
```bash
curl -X POST http://localhost:3000/api/ai/actor-agent \
  -H "Content-Type: application/json" \
  -d '{
    "actorId": "iran",
    "fogOfWarContext": <iran_fog_of_war_context>,
    "scenarioFrame": <iran_actor_framing>
  }'
```

**Resolution engine** (test with two conflicting TurnPlans):
```bash
curl -X POST http://localhost:3000/api/ai/resolution-engine \
  -H "Content-Type: application/json" \
  -d '{
    "fullScenario": <mock_scenario>,
    "turnPlans": [<us_turn_plan>, <iran_turn_plan>]
  }'
```

**Judge** (test scoring on a mock resolution):
```bash
curl -X POST http://localhost:3000/api/ai/judge \
  -H "Content-Type: application/json" \
  -d '{
    "previousState": <mock_scenario>,
    "currentState": <updated_scenario>,
    "resolvedEvents": <mock_events>,
    "turnPlans": [<us_plan>, <iran_plan>]
  }'
```

**Narrator** (test prose quality):
```bash
curl -X POST http://localhost:3000/api/ai/narrator \
  -H "Content-Type: application/json" \
  -d '{
    "turnNumber": 4,
    "resolutionResult": <mock_resolution>,
    "previousNarratives": []
  }'
```

### 3. Verify output structure

**Actor agent checklist:**
- [ ] Returns `situationAssessment` (2-3 paragraphs from Iran's perspective)
- [ ] Returns 8-12+ decisions across all dimensions (military, economic, diplomatic, intelligence, political, information)
- [ ] Each decision has `parameters` array with 2-5 items
- [ ] Each decision has 2-3 named `parameterProfiles`
- [ ] Each decision has `resourceWeight` and `compatibleWith`/`incompatibleWith`
- [ ] Returns a valid `turnPlan` with `primaryAction` + `concurrentActions`
- [ ] `resourceAllocation` sums to 100%
- [ ] Decisions reflect Iran's worldview (asymmetric attrition, not Western conventional doctrine)

**Resolution engine checklist:**
- [ ] Returns `resolvedEvents` array with causal chains
- [ ] Each event has `impacts` with `magnitude` and `thirdPartyEffects`
- [ ] Returns `stateUpdates` per actor
- [ ] Returns `escalationChanges` with rationale
- [ ] Returns `reactionTriggers` with urgency levels
- [ ] US intelligence failure visible: actions based on wrong Iran readiness (25 vs actual 58)
- [ ] Asymmetric drone cost reflected (Shahed $20K vs Patriot $3M)

**Judge checklist:**
- [ ] All 5 scores returned: plausibility, consistency, proportionality, rationality, cascadeLogic
- [ ] `biasCheck.detected` is false (or has valid reason if true)
- [ ] `overallScore` between 0-100
- [ ] Low scores (<70) have specific `issues` with suggestions
- [ ] If score < 60, verify retry logic triggers in game loop

**Narrator checklist:**
- [ ] `narrative` is 3-5 paragraphs, EB Garamond prose quality
- [ ] Both US and Iran named and humanized equally
- [ ] No loaded framing ("terrorist", "aggressor" without attribution)
- [ ] `severity` is one of: `"critical"`, `"major"`, `"moderate"`, `"minor"`
- [ ] `keyTags` array has 3-6 relevant tags

### 4. Check neutrality

Run a quick bias check manually:
- Count how many sentences describe US/Israel vs Iran/adversaries
- Verify Iran's decisions are modeled as rational from Tehran's perspective
- Verify the narrator doesn't editorialize about which side is "right"
- Check that asymmetric strategies (drone attrition, Strait closure) are modeled as valid

### 5. Test the retry loop (judge only)

To test the evaluator-optimizer retry:
1. Submit a deliberately bad resolution (contradictory events, unrealistic magnitudes)
2. Call the judge
3. Verify score comes back < 60
4. Verify the game loop controller calls resolution engine again with judge feedback
5. Verify second attempt scores higher

### 6. Check prompt caching

Verify caching is active by checking token usage in the API response:
```
cache_creation_input_tokens > 0  // first call writes cache
cache_read_input_tokens > 0      // subsequent calls read cache
```

The stable system prompt (NEUTRALITY_PREAMBLE + actor framing) should be cached.
Only the variable turn context (current state, intelligence picture) should be uncached.

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Actor agent ignores fog-of-war | Context not filtered before passing | Use `buildFogOfWarContext()` before calling agent |
| Resolution favors US outcomes | Prompt bias or friction not applied | Check RESOLUTION_ENGINE_PROMPT friction rules |
| Judge scores always 90+ | Judge not calibrated for this scenario | Test with intentionally bad resolution first |
| Narrator uses "terrorist" without attribution | Neutrality preamble not injected | Verify NEUTRALITY_PREAMBLE in system prompt |
| No parameter profiles generated | Actor agent prompt version mismatch | Check `docs/prompt-library.ts` for current prompt |
| Resource allocation sums to <100% | AI rounding error | Add validation in API route before returning |

## Reference files

- `docs/prompt-library.ts` — all agent system prompts
- `docs/agent-architecture.ts` — game loop pseudocode and fog-of-war builder
- `tests/helpers/mock-scenario.ts` — mock Iran scenario data
- `tests/game/fog-of-war.test.ts` — fog-of-war unit tests
- `docs/testing-strategy.md` — full testing strategy and mock patterns
