import type { ContradictionFinding } from '../../types/forensic';

interface Props {
  contradictions: ContradictionFinding[];
}

export function ContradictionPanel({ contradictions }: Props) {
  const evidenceNodes = Array.from(new Set(contradictions.flatMap((item) => item.evidenceIds))).slice(0, 8);

  return (
    <section className="space-y-2">
      <h3 className="font-bold">Contradictions</h3>
      {!contradictions.length && <div className="text-sm text-slate-700">No explicit contradictions were raised in this run.</div>}
      {!!contradictions.length && (
        <div className="border border-slate-200 bg-slate-50 rounded-lg p-2">
          <div className="text-xs font-semibold mb-1">Contradiction network graph</div>
          <svg viewBox="0 0 380 150" className="w-full h-32">
            {contradictions.slice(0, 4).map((item, index) => {
              const x = 60 + index * 80;
              const y = 32;
              return (
                <g key={item.id}>
                  <circle cx={x} cy={y} r="13" fill="#fecaca" stroke="#b91c1c" />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="8">C{index + 1}</text>
                  {item.evidenceIds.slice(0, 3).map((evidenceId, eIndex) => {
                    const nodeIndex = evidenceNodes.indexOf(evidenceId);
                    const ex = 35 + nodeIndex * 40;
                    const ey = 118;
                    return (
                      <line key={`${item.id}_${evidenceId}`} x1={x} y1={y + 13} x2={ex} y2={ey - 11} stroke="#64748b" strokeWidth="1.2" />
                    );
                  })}
                </g>
              );
            })}
            {evidenceNodes.map((evidenceId, index) => {
              const x = 35 + index * 40;
              const y = 118;
              return (
                <g key={evidenceId}>
                  <circle cx={x} cy={y} r="11" fill="#dbeafe" stroke="#1d4ed8" />
                  <text x={x} y={y + 3} textAnchor="middle" fontSize="7">E{index + 1}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
      {contradictions.map((item) => (
        <article key={item.id} className="border border-rose-200 bg-rose-50 rounded-lg p-2 text-sm">
          <div className="font-semibold">{item.title} ({item.severity})</div>
          <div>{item.description}</div>
          <div className="text-xs">Evidence IDs: {item.evidenceIds.join(', ')}</div>
        </article>
      ))}
    </section>
  );
}
