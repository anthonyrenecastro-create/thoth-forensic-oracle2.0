import type { ForensicMechanism } from '../../types/forensic';
import { AssumptionFragilityMechanism } from './AssumptionFragilityMechanism';
import { ConcealmentMechanism } from './ConcealmentMechanism';
import { ContradictionMechanism } from './ContradictionMechanism';
import { EvidenceIndependenceMechanism } from './EvidenceIndependenceMechanism';
import { EvidenceReliabilityMechanism } from './EvidenceReliabilityMechanism';
import { InformationGainMechanism } from './InformationGainMechanism';
import { SearchPODMechanism } from './SearchPODMechanism';
import { StopLocationMechanism } from './StopLocationMechanism';
import { TimelineMechanism } from './TimelineMechanism';
import { TraceConsistencyMechanism } from './TraceConsistencyMechanism';
import { VehicleAccessibilityMechanism } from './VehicleAccessibilityMechanism';

export const FORENSIC_MECHANISMS: ForensicMechanism[] = [
  TimelineMechanism,
  VehicleAccessibilityMechanism,
  StopLocationMechanism,
  ConcealmentMechanism,
  TraceConsistencyMechanism,
  SearchPODMechanism,
  EvidenceReliabilityMechanism,
  EvidenceIndependenceMechanism,
  ContradictionMechanism,
  AssumptionFragilityMechanism,
  InformationGainMechanism,
];
