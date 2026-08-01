import type { ForensicMechanism } from '../../types/forensic';
import { kmReachable, timelineWindowMinutes } from '../forensicMath';
import { bounded, createMechanism, makeProposal } from './_utils';

export const TimelineMechanism: ForensicMechanism = createMechanism({
  id: 'timeline_mechanism',
  name: 'Timeline Feasibility Mechanism',
  reads: ['evidence', 'assumptions', 'candidateZones'],
  writes: ['zonePosteriors', 'warnings'],
  execute(snapshot, context) {
    const proposal = makeProposal('timeline_mechanism');
    const available = timelineWindowMinutes({
      earliestPickupMinutes: 7 * 60 + 30 - context.assumptions.timestampUncertaintyMinutes,
      latestBoundaryMinutes: 10 * 60 + 30 + context.assumptions.timestampUncertaintyMinutes,
      estimatedActivityMinutes: context.assumptions.estimatedActivityMinutes,
      requiredReturnBufferMinutes: context.assumptions.requiredReturnBufferMinutes,
    });

    if (available <= 0) {
      proposal.warnings.push('Timeline window is non-positive under current assumptions.');
      return proposal;
    }

    const maxReachKm = kmReachable(available, context.assumptions.maxVehicleSpeedKmh) / 2;
    const minReachKm = kmReachable(available, context.assumptions.minVehicleSpeedKmh) / 2;

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const temporal = bounded((maxReachKm - minReachKm) / Math.max(1, maxReachKm));
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + temporal * 0.2),
        boundedScore: temporal,
        supportingEvidenceIds: zone.supportingEvidenceIds,
        contradictingEvidenceIds: [],
        assumptions: [
          'Deterministic local routing approximation used.',
          'Real routing data unavailable; result is an estimate.',
        ],
        explanation: `Available minutes: ${available}, one-way reach estimate range around ${minReachKm.toFixed(1)}-${maxReachKm.toFixed(1)} km.`,
      });
    }

    proposal.warnings.push('Real routing data unavailable; deterministic approximation applied.');
    return proposal;
  },
});
