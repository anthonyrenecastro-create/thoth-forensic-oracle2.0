import type { CandidateZone } from '../types/forensic';

export function normalizeScores(scores: Record<string, number>): Record<string, number> {
  const entries = Object.entries(scores);
  const sum = entries.reduce((acc, [, value]) => acc + Math.max(0, value), 0);
  if (sum <= 0) {
    const even = entries.length ? 1 / entries.length : 0;
    return Object.fromEntries(entries.map(([zoneId]) => [zoneId, even]));
  }
  return Object.fromEntries(entries.map(([zoneId, value]) => [zoneId, Math.max(0, value) / sum]));
}

export function applyPodUpdate(prior: number, pod: number): number {
  return prior * (1 - pod);
}

export function applyUnknownPodSensitivity(prior: number, podRange: [number, number, number]) {
  const [low, expected, high] = podRange;
  return {
    low: applyPodUpdate(prior, low),
    expected: applyPodUpdate(prior, expected),
    high: applyPodUpdate(prior, high),
    fragility: Math.max(0, Math.min(1, Math.abs(applyPodUpdate(prior, low) - applyPodUpdate(prior, high)))),
  };
}

export function rankedZoneCorrelation(a: CandidateZone[], b: CandidateZone[]): number {
  if (!a.length || !b.length) {
    return 0;
  }
  const posA = new Map(a.map((zone, i) => [zone.id, i]));
  const pairs = b.filter((zone) => posA.has(zone.id));
  if (!pairs.length) {
    return 0;
  }
  const n = pairs.length;
  let d2 = 0;
  for (let i = 0; i < pairs.length; i += 1) {
    const id = pairs[i].id;
    const da = posA.get(id) ?? i;
    const db = i;
    const d = da - db;
    d2 += d * d;
  }
  return 1 - (6 * d2) / (n * (n * n - 1));
}

export function timelineWindowMinutes(params: {
  earliestPickupMinutes: number;
  latestBoundaryMinutes: number;
  estimatedActivityMinutes: number;
  requiredReturnBufferMinutes: number;
}) {
  const availableMinutes =
    params.latestBoundaryMinutes -
    params.earliestPickupMinutes -
    params.estimatedActivityMinutes -
    params.requiredReturnBufferMinutes;
  return availableMinutes;
}

export function kmReachable(availableMinutes: number, speedKmh: number): number {
  if (availableMinutes <= 0 || speedKmh <= 0) {
    return 0;
  }
  return (availableMinutes / 60) * speedKmh;
}

export function normalizeScenarioWeights(weights: Record<string, number>): Record<string, number> {
  return normalizeScores(weights);
}

export function isImmutableSnapshot<T>(before: Readonly<T>, after: Readonly<T>): boolean {
  return before !== (after as T);
}
