import type { TwinRunResponse } from '../../types/forensic';

interface Props {
  comparison: TwinRunResponse['comparison'];
}

export function TwinComparisonPanel({ comparison }: Props) {
  const agreementPercent = Math.max(0, Math.min(100, comparison.scenarioAgreement * 100));
  const rankPercent = Math.max(0, Math.min(100, (comparison.zoneRankCorrelation + 1) * 50));

  return (
    <section className="border border-slate-300 rounded-lg bg-white p-3 space-y-2">
      <h3 className="font-bold">Twin Comparison</h3>
      <div className="space-y-1">
        <div className="text-sm">Twin scenario agreement gauge: {agreementPercent.toFixed(1)}%</div>
        <div className="h-3 bg-slate-100 rounded overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${agreementPercent}%` }} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm">Zone rank correlation: {comparison.zoneRankCorrelation.toFixed(3)}</div>
        <div className="h-2 bg-slate-100 rounded overflow-hidden">
          <div className="h-full bg-sky-500" style={{ width: `${rankPercent}%` }} />
        </div>
      </div>
      <div className="text-sm">Top-zone overlap: {comparison.topZoneOverlap.join(', ') || 'none'}</div>
      <div className="text-sm">Major conflicts: {comparison.majorConflicts.join(' | ') || 'none'}</div>
      <div className="text-xs">Unsupported claims - Twin A: {comparison.unsupportedClaimCount.twinA}, Twin B: {comparison.unsupportedClaimCount.twinB}</div>
      <div className="text-xs">Latency (ms) - Twin A: {comparison.latencyMs.twinA}, Twin B: {comparison.latencyMs.twinB}</div>
      <div className="text-xs">Token usage - Twin A: {comparison.tokenUsage.twinA}, Twin B: {comparison.tokenUsage.twinB}</div>
      <div className="text-xs">No winner is declared automatically.</div>
    </section>
  );
}
