import type { ForensicMechanism } from '../../types/forensic';
import { bounded, createMechanism, makeProposal, zoneIncludesEvidence } from './_utils';

export const TraceConsistencyMechanism: ForensicMechanism = createMechanism({
  id: 'trace_consistency_mechanism',
  name: 'Trace Consistency Mechanism',
  reads: ['evidence', 'candidateZones'],
  writes: ['zonePosteriors', 'contradictions'],
  execute(snapshot) {
    const proposal = makeProposal('trace_consistency_mechanism');

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const hasTraceBundle = zoneIncludesEvidence(zone, 'E_POTENTIAL_TRACE_PACKAGE');
      const score = bounded(hasTraceBundle ? 0.52 : 0.31);
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + score * 0.1),
        boundedScore: score,
        supportingEvidenceIds: hasTraceBundle ? ['E_POTENTIAL_TRACE_PACKAGE'] : [],
        contradictingEvidenceIds: hasTraceBundle ? [] : ['E_POTENTIAL_TRACE_PACKAGE'],
        assumptions: ['Potential trace is not treated as confirmed DNA or biological attribution.'],
        explanation: 'Checks whether potential trace narratives align with candidate zone hypotheses.',
      });
    }

    proposal.contradictions.push({
      id: 'C_TRACE_NOT_CONFIRMED',
      title: 'Trace attribution unresolved',
      description: 'Potential trace package exists, but public attribution and chain-of-custody are unresolved.',
      evidenceIds: ['E_POTENTIAL_TRACE_PACKAGE'],
      severity: 'medium',
    });

    return proposal;
  },
});
