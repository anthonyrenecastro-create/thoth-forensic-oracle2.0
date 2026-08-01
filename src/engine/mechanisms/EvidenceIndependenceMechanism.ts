import type { ForensicMechanism } from '../../types/forensic';
import { bounded, createMechanism, makeProposal } from './_utils';

export const EvidenceIndependenceMechanism: ForensicMechanism = createMechanism({
  id: 'evidence_independence_mechanism',
  name: 'Evidence Independence Mechanism',
  reads: ['evidence', 'candidateZones'],
  writes: ['zonePosteriors', 'contradictions'],
  execute(snapshot) {
    const proposal = makeProposal('evidence_independence_mechanism');
    const evidenceMap = new Map(snapshot.caseRecord.evidence.map((item) => [item.id, item]));

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const groups = new Set<string>();
      for (const evidenceId of zone.supportingEvidenceIds) {
        const group = evidenceMap.get(evidenceId)?.independenceGroup;
        if (group) {
          groups.add(group);
        }
      }
      const rawCount = zone.supportingEvidenceIds.length || 1;
      const independentCount = groups.size || rawCount;
      const ratio = independentCount / rawCount;
      const score = bounded(ratio);
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + score * 0.16),
        boundedScore: score,
        supportingEvidenceIds: zone.supportingEvidenceIds,
        contradictingEvidenceIds: [],
        assumptions: ['Repeated versions of one claim are collapsed by independenceGroup.'],
        explanation: `Independence ratio ${independentCount}/${rawCount}.`,
      });

      if (ratio < 0.8) {
        proposal.contradictions.push({
          id: `C_IND_${zone.id}`,
          title: `Limited independent support for ${zone.name}`,
          description: 'Multiple supporting claims belong to overlapping independence groups.',
          evidenceIds: zone.supportingEvidenceIds,
          severity: 'medium',
        });
      }
    }

    return proposal;
  },
});
