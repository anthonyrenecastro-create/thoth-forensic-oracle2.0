import type { ForensicCase, MechanismRoundLog } from '../../types/forensic';

export function hrmNarrativePrompt(caseRecord: ForensicCase, ledger: MechanismRoundLog[]): string {
  return [
    'You are Twin B narrative explainer.',
    'Quantitative values are already computed by deterministic mechanisms; do not change them.',
    'Explain scenario narratives and key contradictions from provided ledger only.',
    'Do not assert guilt. Keep uncertainty explicit.',
    '',
    `CASE JSON:\n${JSON.stringify(caseRecord)}`,
    `MECHANISM LEDGER JSON:\n${JSON.stringify(ledger)}`,
  ].join('\n');
}
