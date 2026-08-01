import type { MechanismRoundLog } from '../../types/forensic';

interface Props {
  ledger?: MechanismRoundLog[];
}

export function MechanismLedger({ ledger }: Props) {
  if (!ledger?.length) {
    return <div className="text-sm text-slate-700">No mechanism ledger available for this run.</div>;
  }

  return (
    <section className="space-y-2">
      <h3 className="font-bold">HRM Mechanism Ledger</h3>
      <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
        {ledger.map((entry) => (
          <article key={`${entry.round}-${entry.snapshotHash}`} className="border border-slate-300 rounded-lg bg-white p-3 text-xs space-y-2">
            <div className="font-semibold">Round {entry.round}</div>
            <div>Mechanism proposals: {entry.proposalValues.length}</div>
            <div>Supporting evidence IDs: {entry.supportingEvidenceIds.join(', ') || 'none'}</div>
            <div>Contradicting evidence IDs: {entry.contradictingEvidenceIds.join(', ') || 'none'}</div>
            <div>Assumptions: {entry.assumptions.join(' | ') || 'none'}</div>
            <div>Arbitration: {entry.arbitrationDecision.join(' | ')}</div>
            <div>Stopping reason: {entry.stoppingReason || 'continuing'}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
