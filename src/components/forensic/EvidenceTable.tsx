import type { EvidenceItem } from '../../types/forensic';

interface Props {
  evidence: EvidenceItem[];
  onGradeChange: (evidenceId: string, grade: EvidenceItem['grade']) => void;
}

const gradeOptions: EvidenceItem['grade'][] = [
  'confirmed',
  'potential',
  'unverified',
  'unknown',
  'context',
  'model_assumption',
];

export function EvidenceTable({ evidence, onGradeChange }: Props) {
  return (
    <div className="overflow-auto border border-slate-300 rounded-lg bg-white">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Title</th>
            <th className="text-left p-2">Category</th>
            <th className="text-left p-2">Source</th>
            <th className="text-left p-2">Reliability</th>
            <th className="text-left p-2">Grade</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((item) => (
            <tr key={item.id} className="border-t border-slate-200 align-top">
              <td className="p-2 font-mono">{item.id}</td>
              <td className="p-2">
                <div className="font-semibold">{item.title}</div>
                <div className="text-slate-600">{item.description}</div>
              </td>
              <td className="p-2">{item.category}</td>
              <td className="p-2">{item.sourceType}</td>
              <td className="p-2">{item.reliability.toFixed(2)}</td>
              <td className="p-2">
                <select
                  className="border border-slate-300 rounded px-2 py-1 bg-white"
                  value={item.grade}
                  onChange={(event) => onGradeChange(item.id, event.target.value as EvidenceItem['grade'])}
                >
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
