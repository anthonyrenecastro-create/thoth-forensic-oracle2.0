import type { ForensicMechanism } from '../../types/forensic';
import { bounded, createMechanism, makeProposal, zoneIncludesEvidence } from './_utils';

export const StopLocationMechanism: ForensicMechanism = createMechanism({
  id: 'stop_location_mechanism',
  name: 'Stop Location Mechanism',
  reads: ['evidence', 'candidateZones'],
  writes: ['zonePosteriors'],
  execute(snapshot) {
    const proposal = makeProposal('stop_location_mechanism');

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const hasPickupEvidence = zoneIncludesEvidence(zone, 'E_LAST_SEEN_BUS_STOP_0730');
      const hasVehicleEvidence = zoneIncludesEvidence(zone, 'E_GREY_RANGER_ENTRY');
      const stopScore = bounded((hasPickupEvidence ? 0.55 : 0.2) + (hasVehicleEvidence ? 0.3 : 0.05));
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + stopScore * 0.2),
        boundedScore: stopScore,
        supportingEvidenceIds: zone.supportingEvidenceIds,
        contradictingEvidenceIds: zone.contradictingEvidenceIds,
        assumptions: ['Stop opportunity is inferred from evidence location uncertainty.'],
        explanation: 'Scores likely stop points around reported pickup and movement narratives.',
      });
    }

    return proposal;
  },
});
