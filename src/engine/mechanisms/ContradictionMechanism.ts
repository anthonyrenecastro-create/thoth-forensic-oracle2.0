import type { ForensicMechanism } from '../../types/forensic';
import { bounded, createMechanism, makeProposal } from './_utils';

export const ContradictionMechanism: ForensicMechanism = createMechanism({
  id: 'contradiction_mechanism',
  name: 'Contradiction Mechanism',
  reads: ['evidence', 'candidateZones', 'unknowns'],
  writes: ['zonePosteriors', 'contradictions'],
  execute(snapshot) {
    const proposal = makeProposal('contradiction_mechanism');

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const contradictionLoad = zone.contradictingEvidenceIds.length;
      const score = bounded(1 - contradictionLoad * 0.2);
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + score * 0.1),
        boundedScore: score,
        supportingEvidenceIds: zone.supportingEvidenceIds,
        contradictingEvidenceIds: zone.contradictingEvidenceIds,
        assumptions: ['Contradictions reduce confidence without forcing zero probability.'],
        explanation: `Contradiction load = ${contradictionLoad}.`,
      });
    }

    if (snapshot.caseRecord.unknowns.some((unknown) => unknown.impact === 'high')) {
      proposal.warnings.push('High-impact unknowns limit commitment strength.');
    }

    return proposal;
  },
});
