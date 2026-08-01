import type { ForensicCase } from '../../types/forensic';
import { timelineWindowMinutes } from '../../engine/forensicMath';
import { hp } from '../../engine/forensicAnalytics';

interface Props {
  caseRecord: ForensicCase;
}

export function TimelinePanel({ caseRecord }: Props) {
  const a = caseRecord.assumptions;
  const params = {
    earliestPickupMinutes: 7 * 60 + 30 - a.timestampUncertaintyMinutes,
    latestBoundaryMinutes: 10 * 60 + 30 + a.timestampUncertaintyMinutes,
    estimatedActivityMinutes: a.estimatedActivityMinutes,
    requiredReturnBufferMinutes: a.requiredReturnBufferMinutes,
  };
  const available = timelineWindowMinutes(params);
  const operationalWindow = hp(params);
  const totalWindow = Math.max(1, params.latestBoundaryMinutes - params.earliestPickupMinutes);
  const activityPct = Math.min(100, (a.estimatedActivityMinutes / totalWindow) * 100);
  const returnPct = Math.min(100, (a.requiredReturnBufferMinutes / totalWindow) * 100);
  const feasiblePct = Math.max(0, Math.min(100, (Math.max(0, operationalWindow) / totalWindow) * 100));

  return (
    <section className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <h3 className="font-bold">Timeline Window</h3>
      <div className="text-sm">Reported pickup boundary: approximately 07:30 (+/- uncertainty)</div>
      <div className="text-sm">Approximate transaction boundary: approximately 10:30 (+/- uncertainty)</div>
      <div className="text-sm">
        Deterministic approximation: availableMinutes = latestBoundaryMinutes - earliestPickupMinutes - estimatedActivityMinutes -
        requiredReturnBufferMinutes
      </div>
      <div className="font-semibold">Available minutes estimate: {available}</div>
      <div className="font-semibold">Operational window hp: {operationalWindow}</div>
      <div className="space-y-1 text-xs">
        <div>Timeline feasibility band</div>
        <div className="h-3 rounded bg-slate-100 overflow-hidden flex">
          <div className="bg-amber-400" style={{ width: `${activityPct}%` }} title="estimated activity" />
          <div className="bg-rose-400" style={{ width: `${returnPct}%` }} title="return buffer" />
          <div className="bg-emerald-500" style={{ width: `${feasiblePct}%` }} title="feasible residual window" />
        </div>
      </div>
      <div className="text-xs text-amber-900">Warning: real routing data is not integrated; this is a bounded local approximation.</div>
    </section>
  );
}
