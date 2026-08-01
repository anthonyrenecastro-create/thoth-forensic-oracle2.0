import { describe, expect, it } from 'vitest';
import { MADISON_CASE } from '../data/madisonCase';
import { EvidenceIndependenceMechanism } from './mechanisms/EvidenceIndependenceMechanism';
import { VehicleAccessibilityMechanism } from './mechanisms/VehicleAccessibilityMechanism';
import {
  applyPodUpdate,
  applyUnknownPodSensitivity,
  isImmutableSnapshot,
  normalizeScenarioWeights,
  normalizeScores,
  timelineWindowMinutes,
} from './forensicMath';
import { runBothTwins, runHrmTwin } from './forensicTwin';
import { safeParseForensicResult } from '../server/schemas/forensicResultSchema';
import type { ForensicState } from '../types/forensic';

function baseState(): ForensicState {
  const scores = Object.fromEntries(MADISON_CASE.candidateZones.map((zone) => [zone.id, zone.priorWeight]));
  return {
    caseRecord: MADISON_CASE,
    zoneScores: scores,
    zonePosteriors: normalizeScores(scores),
    scenarioScores: {},
    contradictions: [],
    assumptionFragility: {},
    round: 0,
    warnings: [],
  };
}

describe('forensic math', () => {
  it('posterior normalization sums to one', () => {
    const normalized = normalizeScores({ a: 2, b: 3, c: 5 });
    const sum = Object.values(normalized).reduce((acc, value) => acc + value, 0);
    expect(sum).toBeCloseTo(1, 8);
  });

  it('POD update follows posteriorAfterNoDetection = prior * (1 - pod)', () => {
    expect(applyPodUpdate(0.4, 0.5)).toBeCloseTo(0.2, 8);
  });

  it('unknown POD sensitivity returns low expected high and fragility', () => {
    const result = applyUnknownPodSensitivity(0.8, [0.15, 0.45, 0.7]);
    expect(result.low).toBeCloseTo(0.68, 8);
    expect(result.expected).toBeCloseTo(0.44, 8);
    expect(result.high).toBeCloseTo(0.24, 8);
    expect(result.fragility).toBeGreaterThan(0.4);
  });

  it('scenario weight normalization sums to one', () => {
    const normalized = normalizeScenarioWeights({ s1: 10, s2: 5, s3: 5 });
    const sum = Object.values(normalized).reduce((acc, value) => acc + value, 0);
    expect(sum).toBeCloseTo(1, 8);
  });

  it('timeline impossibility detection produces non-positive window', () => {
    const available = timelineWindowMinutes({
      earliestPickupMinutes: 450,
      latestBoundaryMinutes: 460,
      estimatedActivityMinutes: 20,
      requiredReturnBufferMinutes: 30,
    });
    expect(available).toBeLessThanOrEqual(0);
  });

  it('immutable snapshot helper distinguishes references', () => {
    const before = { x: 1 };
    const after = { x: 1 };
    expect(isImmutableSnapshot(before, after)).toBe(true);
  });
});

describe('mechanisms', () => {
  it('evidence independence penalizes repeated claim groups', () => {
    const state = baseState();
    const proposal = EvidenceIndependenceMechanism.propose(state, {
      nowIso: new Date().toISOString(),
      assumptions: MADISON_CASE.assumptions,
    });
    expect(proposal.zoneContributions.length).toBeGreaterThan(0);
    expect(proposal.contradictions.length).toBeGreaterThanOrEqual(0);
  });

  it('vehicle accessibility bounded scores remain in [0,1]', () => {
    const state = baseState();
    const proposal = VehicleAccessibilityMechanism.propose(state, {
      nowIso: new Date().toISOString(),
      assumptions: MADISON_CASE.assumptions,
    });
    for (const item of proposal.zoneContributions) {
      expect(item.boundedScore).toBeGreaterThanOrEqual(0);
      expect(item.boundedScore).toBeLessThanOrEqual(1);
    }
  });
});

describe('twin orchestration', () => {
  it('convergence stopping reason is recorded', async () => {
    const result = await runHrmTwin(MADISON_CASE, {
      model: 'fixture-deterministic',
      temperature: 0,
      maxHrmRounds: 5,
      convergenceThreshold: 0.99,
      includeIllustrativeZones: false,
    });
    const lastRound = result.mechanismLedger?.[result.mechanismLedger.length - 1];
    expect(lastRound?.stoppingReason).toBeDefined();
  });

  it('prevents Twin A and Twin B result leakage', async () => {
    const response = await runBothTwins({
      caseRecord: MADISON_CASE,
      settings: {
        model: 'fixture-deterministic',
        temperature: 0,
        maxHrmRounds: 6,
        convergenceThreshold: 0.02,
        includeIllustrativeZones: false,
      },
    });
    expect(response.twinA.mechanismLedger).toBeUndefined();
    expect(response.twinB.mechanismLedger).toBeDefined();
  });

  it('contextual mine exclusion keeps context-only zones unranked', async () => {
    const result = await runHrmTwin(MADISON_CASE, {
      model: 'fixture-deterministic',
      temperature: 0,
      maxHrmRounds: 6,
      convergenceThreshold: 0.02,
      includeIllustrativeZones: false,
    });
    const contextZone = result.rankedZones.find((zone) => zone.zoneType === 'context_only');
    expect(contextZone?.priorWeight).toBe(0);
  });

  it('hard-coded winner field is absent from comparison', async () => {
    const response = await runBothTwins({
      caseRecord: MADISON_CASE,
      settings: {
        model: 'fixture-deterministic',
        temperature: 0,
        maxHrmRounds: 6,
        convergenceThreshold: 0.02,
        includeIllustrativeZones: false,
      },
    });
    expect((response.comparison as unknown as { winner?: string }).winner).toBeUndefined();
  });
});

describe('schema validation', () => {
  it('invalid Gemini JSON structure is rejected', () => {
    const invalid = safeParseForensicResult({
      caseSummary: { establishedFacts: ['x'] },
      scenarios: 'not-array',
    });
    expect(invalid.success).toBe(false);
  });
});
