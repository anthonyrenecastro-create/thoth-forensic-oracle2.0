import type { ForensicMechanism } from '../../types/forensic';
import { bounded, createMechanism, makeProposal } from './_utils';

export const EvidenceReliabilityMechanism: ForensicMechanism = createMechanism({
  id: 'evidence_reliability_mechanism',
  name: 'Evidence Reliability Mechanism',
  reads: ['evidence', 'candidateZones'],
  writes: ['zonePosteriors'],
  execute(snapshot) {
    const proposal = makeProposal('evidence_reliability_mechanism');
    const evidenceMap = new Map(snapshot.caseRecord.evidence.map((item) => [item.id, item]));

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const reliabilities = zone.supportingEvidenceIds
        .map((id) => evidenceMap.get(id)?.reliability ?? 0.3)
        .filter((value) => value >= 0);
      const average = reliabilities.length
        ? reliabilities.reduce((acc, value) => acc + value, 0) / reliabilities.length
        : 0.25;
      const score = bounded(average);
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + score * 0.25),
        boundedScore: score,
        supportingEvidenceIds: zone.supportingEvidenceIds,
        contradictingEvidenceIds: zone.contradictingEvidenceIds,
        assumptions: ['Reliability scores reflect public-source confidence, not legal proof.'],
        explanation: 'Aggregates reliability over supporting evidence items.',
      });
    }

    return proposal;
  },
});
