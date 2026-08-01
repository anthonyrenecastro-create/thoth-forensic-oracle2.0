import type { ForensicMechanism } from '../../types/forensic';
import { bounded, createMechanism, makeProposal } from './_utils';

export const AssumptionFragilityMechanism: ForensicMechanism = createMechanism({
  id: 'assumption_fragility_mechanism',
  name: 'Assumption Fragility Mechanism',
  reads: ['assumptions', 'candidateZones'],
  writes: ['assumptionFragility', 'zonePosteriors'],
  execute(snapshot, context) {
    const proposal = makeProposal('assumption_fragility_mechanism');
    const fragilityBase = bounded(
      context.assumptions.redactionImpactSensitivity * 0.5 +
        context.assumptions.timestampUncertaintyMinutes / 180,
    );

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const fragility = bounded(fragilityBase + zone.assumptions.length * 0.06);
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + (1 - fragility) * 0.1),
        boundedScore: 1 - fragility,
        supportingEvidenceIds: zone.supportingEvidenceIds,
        contradictingEvidenceIds: zone.contradictingEvidenceIds,
        assumptions: ['Fragility rises as redaction sensitivity and timestamp uncertainty rise.'],
        explanation: `Fragility estimate ${fragility.toFixed(2)} for zone assumptions.`,
      });
    }

    return proposal;
  },
});
