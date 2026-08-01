import type { ForensicCase } from '../../types/forensic';
import { EvidenceTable } from './EvidenceTable';

interface Props {
  caseRecord: ForensicCase;
  onCaseRecordChange: (next: ForensicCase) => void;
}

export function CaseEvidencePanel({ caseRecord, onCaseRecordChange }: Props) {
  const onGradeChange = (evidenceId: string, grade: ForensicCase['evidence'][number]['grade']) => {
    const next = {
      ...caseRecord,
      evidence: caseRecord.evidence.map((item) => (item.id === evidenceId ? { ...item, grade } : item)),
    };
    onCaseRecordChange(next);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">Case Evidence</h2>
      <p className="text-sm text-slate-700">
        Evidence labels must remain explicit: verified evidence, potential evidence, unverified claims, model assumptions, and
        contextual geography are distinct.
      </p>
      <EvidenceTable evidence={caseRecord.evidence} onGradeChange={onGradeChange} />
    </section>
  );
}
