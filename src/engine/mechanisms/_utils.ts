import type {
  CandidateZone,
  ForensicMechanism,
  ForensicState,
  MechanismContext,
  MechanismProposal,
} from '../../types/forensic';

export function makeProposal(mechanismId: string): MechanismProposal {
  return {
    mechanismId,
    zoneContributions: [],
    hypothesisContributions: [],
    contradictions: [],
    warnings: [],
  };
}

export function zoneBase(snapshot: Readonly<ForensicState>, zone: CandidateZone) {
  return snapshot.zonePosteriors[zone.id] ?? zone.priorWeight;
}

export function bounded(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function zoneIncludesEvidence(zone: CandidateZone, evidenceId: string): boolean {
  return zone.supportingEvidenceIds.includes(evidenceId);
}

export function createMechanism(def: Omit<ForensicMechanism, 'propose'> & {
  execute: (snapshot: Readonly<ForensicState>, context: MechanismContext) => MechanismProposal;
}): ForensicMechanism {
  return {
    id: def.id,
    name: def.name,
    reads: def.reads,
    writes: def.writes,
    propose(snapshot, context) {
      return def.execute(snapshot, context);
    },
  };
}
