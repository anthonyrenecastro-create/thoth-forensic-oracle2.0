import type { ForensicMechanism } from '../../types/forensic';
import { bounded, createMechanism, makeProposal } from './_utils';

export const InformationGainMechanism: ForensicMechanism = createMechanism({
  id: 'information_gain_mechanism',
  name: 'Information Gain Mechanism',
  reads: ['zonePosteriors', 'unknowns'],
  writes: ['warnings'],
  execute(snapshot) {
    const proposal = makeProposal('information_gain_mechanism');
    const topPosterior = Math.max(...Object.values(snapshot.zonePosteriors), 0);
    const uncertaintyMass = 1 - topPosterior;

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const score = bounded(0.3 + uncertaintyMass * 0.7);
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + score * 0.05),
        boundedScore: score,
        supportingEvidenceIds: zone.supportingEvidenceIds,
        contradictingEvidenceIds: zone.contradictingEvidenceIds,
        assumptions: ['Information gain is comparative and assumption-sensitive.'],
        explanation: 'Prefers actions that reduce uncertainty over strongly unresolved zones.',
      });
    }

    proposal.warnings.push('Information-gain ranking is analytical and not a legal conclusion.');
    return proposal;
  },
});
