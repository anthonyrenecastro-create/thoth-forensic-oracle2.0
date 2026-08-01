import type { CandidateZone, EvidenceItem, ForensicCase, TwinRunResponse } from '../types/forensic';

const GRADE_NUMERIC: Record<EvidenceItem['grade'], number> = {
  confirmed: 1,
  potential: 0.7,
  unverified: 0.4,
  unknown: 0.2,
  context: 0.1,
  model_assumption: 0.25,
};

export function em<T>(value: T | { default: T; __esModule?: boolean }): T {
  if (value && typeof value === 'object' && '__esModule' in value && 'default' in value) {
    return (value as { default: T }).default;
  }
  return value as T;
}

export function Io(zone: CandidateZone): Array<[number, number]> | null {
  return 'coordinates' in zone.geometry ? zone.geometry.coordinates : null;
}

export function Id(zone: CandidateZone): [number, number] | null {
  const coordinates = Io(zone);
  return coordinates?.[0] ?? null;
}

export function $d(zone: CandidateZone, twin: 'a' | 'b') {
  if (zone.zoneType === 'context_only') {
    return { color: '#64748b', fillColor: '#cbd5e1', fillOpacity: 0.25 };
  }
  return twin === 'a'
    ? { color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.3 }
    : { color: '#7c2d12', fillColor: '#fb923c', fillOpacity: 0.3 };
}

export function hp(args: {
  latestBoundaryMinutes: number;
  earliestPickupMinutes: number;
  estimatedActivityMinutes: number;
  requiredReturnBufferMinutes: number;
}) {
  return (
    args.latestBoundaryMinutes -
    args.earliestPickupMinutes -
    args.estimatedActivityMinutes -
    args.requiredReturnBufferMinutes
  );
}

export function gradeScore(grade: EvidenceItem['grade']) {
  return GRADE_NUMERIC[grade] ?? 0;
}

export function calibrateEvidenceReliability(evidence: EvidenceItem[]) {
  return evidence.map((item) => {
    const alpha = 1 + item.reliability * 9;
    const beta = 1 + (1 - item.reliability) * 9;
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / (((alpha + beta) ** 2) * (alpha + beta + 1));
    return {
      evidenceId: item.id,
      title: item.title,
      alpha,
      beta,
      mean,
      variance,
    };
  });
}

export function buildBayesianWaterfall(evidence: EvidenceItem[]) {
  let running = 0.5;
  return evidence.map((item) => {
    const effect = (item.reliability - 0.5) * gradeScore(item.grade) * 0.22;
    const previous = running;
    running = Math.min(0.98, Math.max(0.02, running + effect));
    return {
      evidenceId: item.id,
      title: item.title,
      previous,
      next: running,
      delta: running - previous,
    };
  });
}

function randomNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) {
    u = Math.random();
  }
  while (v === 0) {
    v = Math.random();
  }
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runMonteCarloUncertainty(
  zones: CandidateZone[],
  assumptions: ForensicCase['assumptions'],
  iterations = 500,
) {
  if (!zones.length || iterations <= 0) {
    return [];
  }

  const sampled: Record<string, number[]> = Object.fromEntries(zones.map((zone) => [zone.id, []]));

  for (let i = 0; i < iterations; i += 1) {
    const podNoise = Math.max(0.01, Math.min(0.99, assumptions.podExpected + randomNormal() * 0.1));
    const redactionPenalty = 1 - assumptions.redactionImpactSensitivity * 0.35;
    const trial = zones.map((zone) => {
      const uncertaintyNoise = 1 - randomNormal() * ((zone.uncertainty[1] - zone.uncertainty[0]) * 0.2);
      const raw = Math.max(
        0,
        zone.priorWeight * uncertaintyNoise * (1 - podNoise * 0.22) * redactionPenalty * (1 + assumptions.concealmentWeight * 0.15),
      );
      return { id: zone.id, raw };
    });

    const total = trial.reduce((sum, item) => sum + item.raw, 0) || 1;
    for (const item of trial) {
      sampled[item.id].push(item.raw / total);
    }
  }

  return zones.map((zone) => {
    const values = sampled[zone.id].slice().sort((a, b) => a - b);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const low = values[Math.floor(values.length * 0.1)] ?? mean;
    const high = values[Math.floor(values.length * 0.9)] ?? mean;
    return {
      zoneId: zone.id,
      name: zone.name,
      mean,
      low,
      high,
      values,
    };
  });
}

export function buildPodShift(zones: CandidateZone[], podRange: [number, number, number]) {
  const [low, expected, high] = podRange;
  return zones.map((zone) => ({
    zoneId: zone.id,
    name: zone.name,
    prior: zone.priorWeight,
    low: zone.priorWeight * (1 - low),
    expected: zone.priorWeight * (1 - expected),
    high: zone.priorWeight * (1 - high),
  }));
}

function pearson(x: number[], y: number[]) {
  if (!x.length || x.length !== y.length) {
    return 0;
  }
  const mx = x.reduce((sum, value) => sum + value, 0) / x.length;
  const my = y.reduce((sum, value) => sum + value, 0) / y.length;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i += 1) {
    const xd = x[i] - mx;
    const yd = y[i] - my;
    num += xd * yd;
    dx += xd * xd;
    dy += yd * yd;
  }
  if (!dx || !dy) {
    return 0;
  }
  return num / Math.sqrt(dx * dy);
}

export function buildEvidenceCorrelationMatrix(caseRecord: ForensicCase) {
  const reliability = caseRecord.evidence.map((item) => item.reliability);
  const grade = caseRecord.evidence.map((item) => gradeScore(item.grade));
  const disputed = caseRecord.evidence.map((item) => (item.disputed ? 1 : 0));
  const vectors: Array<{ id: string; values: number[] }> = [
    { id: 'reliability', values: reliability },
    { id: 'grade', values: grade },
    { id: 'disputed', values: disputed },
  ];

  return vectors.map((row) => ({
    metric: row.id,
    correlations: vectors.map((column) => ({ metric: column.id, value: pearson(row.values, column.values) })),
  }));
}

export function buildSensitivityTornado(caseRecord: ForensicCase, zones: CandidateZone[]) {
  const baseline = zones[0]?.priorWeight ?? 0;
  const assumptions = caseRecord.assumptions;
  const knobs: Array<{ key: keyof ForensicCase['assumptions']; label: string; spread: number }> = [
    { key: 'podExpected', label: 'POD expected', spread: 0.15 },
    { key: 'timestampUncertaintyMinutes', label: 'Timestamp uncertainty', spread: 0.2 },
    { key: 'concealmentWeight', label: 'Concealment weight', spread: 0.15 },
    { key: 'redactionImpactSensitivity', label: 'Redaction sensitivity', spread: 0.2 },
    { key: 'evidenceDecay', label: 'Evidence decay', spread: 0.18 },
  ];

  const impact = (value: number, key: keyof ForensicCase['assumptions']) => {
    const delta = value - (assumptions[key] as number);
    if (key === 'podExpected') {
      return baseline * (1 - delta * 0.7);
    }
    if (key === 'timestampUncertaintyMinutes') {
      return baseline * (1 - delta / 500);
    }
    if (key === 'redactionImpactSensitivity') {
      return baseline * (1 - delta * 0.35);
    }
    return baseline * (1 + delta * 0.3);
  };

  return knobs
    .map((knob) => {
      const current = assumptions[knob.key] as number;
      const down = Math.max(0, current * (1 - knob.spread));
      const up = current * (1 + knob.spread);
      const lowScore = impact(down, knob.key);
      const highScore = impact(up, knob.key);
      return {
        key: knob.key,
        label: knob.label,
        lowDelta: lowScore - baseline,
        highDelta: highScore - baseline,
        width: Math.abs(highScore - lowScore),
      };
    })
    .sort((a, b) => b.width - a.width);
}

export function summarizeGuardrailCompliance(caseRecord: ForensicCase, latestRun: TwinRunResponse | null) {
  const unresolvedUnknowns = caseRecord.unknowns.filter((item) => item.impact === 'high').length;
  const contradictionCount = (latestRun?.twinA.contradictions.length ?? 0) + (latestRun?.twinB.contradictions.length ?? 0);
  const required = caseRecord.guardrails.length;
  const active = required;
  const riskFlags = unresolvedUnknowns + contradictionCount;
  return {
    required,
    active,
    riskFlags,
    complianceScore: Math.max(0, Math.min(1, (active - Math.min(active, riskFlags * 0.08)) / Math.max(1, required))),
  };
}
