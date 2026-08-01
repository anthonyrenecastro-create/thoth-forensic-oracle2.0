import type { ForensicMechanism } from '../../types/forensic';
import { bounded, createMechanism, makeProposal } from './_utils';

export const VehicleAccessibilityMechanism: ForensicMechanism = createMechanism({
  id: 'vehicle_accessibility_mechanism',
  name: 'Vehicle Accessibility Mechanism',
  reads: ['candidateZones', 'assumptions'],
  writes: ['zonePosteriors'],
  execute(snapshot, context) {
    const proposal = makeProposal('vehicle_accessibility_mechanism');
    const speedRange = context.assumptions.maxVehicleSpeedKmh - context.assumptions.minVehicleSpeedKmh;
    const normalizedRange = bounded(speedRange / 120);

    for (const zone of snapshot.caseRecord.candidateZones) {
      const accessible = zone.zoneType === 'context_only' ? 0 : bounded(0.35 + normalizedRange * 0.65);
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + accessible * 0.15),
        boundedScore: accessible,
        supportingEvidenceIds: zone.supportingEvidenceIds,
        contradictingEvidenceIds: zone.contradictingEvidenceIds,
        assumptions: ['Road-class assumptions are coarse and do not use live routing APIs.'],
        explanation: 'Accessibility derived from configured min/max vehicle speed assumptions.',
      });
    }

    return proposal;
  },
});
