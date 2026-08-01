import type { ForensicMechanism } from '../../types/forensic';
import { bounded, createMechanism, makeProposal } from './_utils';

export const ConcealmentMechanism: ForensicMechanism = createMechanism({
  id: 'concealment_mechanism',
  name: 'Concealment Opportunity Mechanism',
  reads: ['candidateZones', 'assumptions'],
  writes: ['zonePosteriors'],
  execute(snapshot, context) {
    const proposal = makeProposal('concealment_mechanism');
    const weight = context.assumptions.concealmentWeight;

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const base =
        zone.zoneType === 'final_concealment' || zone.zoneType === 'recovery_zone'
          ? 0.7
          : zone.zoneType === 'temporary_concealment'
            ? 0.6
            : 0.35;
      const score = bounded(base * (0.5 + weight));
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + score * 0.2),
        boundedScore: score,
        supportingEvidenceIds: zone.supportingEvidenceIds,
        contradictingEvidenceIds: zone.contradictingEvidenceIds,
        assumptions: ['Concealment score driven by user assumption weight and zone type.'],
        explanation: 'Ranks concealment opportunity for each candidate zone.',
      });
    }

    return proposal;
  },
});
