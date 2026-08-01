import type { ForensicMechanism } from '../../types/forensic';
import { applyUnknownPodSensitivity } from '../forensicMath';
import { createMechanism, makeProposal } from './_utils';

export const SearchPODMechanism: ForensicMechanism = createMechanism({
  id: 'search_pod_mechanism',
  name: 'Search POD Mechanism',
  reads: ['searches', 'candidateZones', 'assumptions'],
  writes: ['zonePosteriors', 'assumptionFragility'],
  execute(snapshot, context) {
    const proposal = makeProposal('search_pod_mechanism');
    const searchedZoneIds = new Set(snapshot.caseRecord.searches.map((s) => s.polygon.id));

    for (const zone of snapshot.caseRecord.candidateZones) {
      if (zone.zoneType === 'context_only') {
        continue;
      }
      const isSearched = Array.from(searchedZoneIds).some((id) =>
        (zone.geometry as { id?: string }).id ? (zone.geometry as { id?: string }).id === id : false,
      );
      const prior = snapshot.zonePosteriors[zone.id] ?? zone.priorWeight;
      const podSensitivity = applyUnknownPodSensitivity(prior, [
        context.assumptions.podLow,
        context.assumptions.podExpected,
        context.assumptions.podHigh,
      ]);

      const expectedPosterior = isSearched ? podSensitivity.expected : prior;
      proposal.zoneContributions.push({
        zoneId: zone.id,
        logContribution: Math.log(1 + expectedPosterior) - Math.log(1 + prior),
        boundedScore: expectedPosterior,
        supportingEvidenceIds: isSearched ? ['E_SEARCH_2024_GROUND'] : zone.supportingEvidenceIds,
        contradictingEvidenceIds: [],
        assumptions: isSearched
          ? ['PosteriorAfterNoDetection = prior * (1 - pod).', 'POD may be unknown and is treated as sensitivity range.']
          : ['No search adjustment applied to unsearched zone.'],
        explanation: `POD sensitivity low/expected/high = ${podSensitivity.low.toFixed(3)} / ${podSensitivity.expected.toFixed(3)} / ${podSensitivity.high.toFixed(3)}.`,
      });

      if (isSearched) {
        proposal.warnings.push('One or more searched zones use unknown POD assumptions.');
      }
    }

    return proposal;
  },
});
