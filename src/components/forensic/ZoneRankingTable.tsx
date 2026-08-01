import type { CandidateZone } from '../../types/forensic';

interface Props {
  zones: CandidateZone[];
  title: string;
}

export function ZoneRankingTable({ zones, title }: Props) {
  return (
    <section className="space-y-2">
      <h3 className="font-bold">{title}</h3>
      <div className="overflow-auto border border-slate-300 rounded-lg bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2">Rank</th>
              <th className="text-left p-2">Zone</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Score</th>
              <th className="text-left p-2">Uncertainty</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone, index) => (
              <tr key={zone.id} className="border-t border-slate-200">
                <td className="p-2">{index + 1}</td>
                <td className="p-2">{zone.name}</td>
                <td className="p-2">{zone.zoneType}</td>
                <td className="p-2">{zone.priorWeight.toFixed(3)}</td>
                <td className="p-2">[{zone.uncertainty[0].toFixed(2)}, {zone.uncertainty[1].toFixed(2)}]</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
