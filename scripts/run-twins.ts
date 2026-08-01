import { MADISON_CASE } from '../src/data/madisonCase';
import { runBothTwins } from '../src/engine/forensicTwin';

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

async function main() {
  const model = process.env.TWINS_MODEL || 'fixture-deterministic';
  const temperature = parseNumber(process.env.TWINS_TEMPERATURE, 0);
  const maxHrmRounds = parseNumber(process.env.TWINS_MAX_HRM_ROUNDS, 6);
  const convergenceThreshold = parseNumber(process.env.TWINS_CONVERGENCE_THRESHOLD, 0.02);
  const includeIllustrativeZones = parseBoolean(process.env.TWINS_INCLUDE_ILLUSTRATIVE_ZONES, false);

  const result = await runBothTwins({
    caseRecord: MADISON_CASE,
    settings: {
      model,
      temperature,
      maxHrmRounds,
      convergenceThreshold,
      includeIllustrativeZones,
    },
  });

  const summary = {
    runId: result.runId,
    caseId: result.caseId,
    twinA: {
      scenarios: result.twinA.scenarios.length,
      zones: result.twinA.rankedZones.length,
      isSynthetic: result.twinA.isSynthetic,
      latencyMs: result.twinA.latencyMs,
      tokens: result.twinA.tokenUsage,
    },
    twinB: {
      scenarios: result.twinB.scenarios.length,
      zones: result.twinB.rankedZones.length,
      ledgerRounds: result.twinB.mechanismLedger?.length ?? 0,
      isSynthetic: result.twinB.isSynthetic,
      latencyMs: result.twinB.latencyMs,
      tokens: result.twinB.tokenUsage,
    },
    comparison: result.comparison,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('run:twins failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
