import type { ForensicCase } from '../../types/forensic';

export function baselineForensicPrompt(caseRecord: ForensicCase): string {
  return [
    'You are Twin A — Direct Gemini Forensic Analyst.',
    'Analyze the case record and return only JSON.',
    'Do not declare any named individual guilty.',
    'Distinguish verified evidence, potential evidence, unverified claims, model assumptions, and contextual geography.',
    'Return 4-8 plausible scenarios and ranked zones with uncertainty bounds.',
    'Include contradictions, unknowns, route hypotheses, recommended next actions, and limitations.',
    'Use bounded analytical uncertainty, not unsupported certainty.',
    '',
    `CASE JSON:\n${JSON.stringify(caseRecord)}`,
  ].join('\n');
}
