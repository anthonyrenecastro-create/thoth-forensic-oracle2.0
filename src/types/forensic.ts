import type { EvidenceGrade, EvidenceSourceType, GeoPoint, GeoPolygon } from './geospatial';

export type EvidenceCategory =
  | 'timeline'
  | 'vehicle'
  | 'trace'
  | 'witness'
  | 'search'
  | 'location'
  | 'digital'
  | 'behavioral'
  | 'context';

export interface EvidenceItem {
  id: string;
  title: string;
  description: string;
  category: EvidenceCategory;
  grade: EvidenceGrade;
  sourceType: EvidenceSourceType;
  sourceLabel: string;
  reliability: number;
  independenceGroup?: string;
  disputed: boolean;
  location?: GeoPoint | GeoPolygon;
  observedAt?: string;
  unknowns?: string[];
}

export interface SearchRecord {
  id: string;
  name: string;
  polygon: GeoPolygon;
  date?: string;
  method?: string;
  personnel?: number;
  publicOutcome?: string;
  podMin?: number;
  podMax?: number;
  podSource: 'documented' | 'estimated' | 'unknown';
}

export interface CandidateZone {
  id: string;
  name: string;
  geometry: GeoPoint | GeoPolygon;
  zoneType:
    | 'crime_scene'
    | 'vehicle_stop'
    | 'transfer_site'
    | 'temporary_concealment'
    | 'final_concealment'
    | 'recovery_zone'
    | 'context_only';
  priorWeight: number;
  temporalFeasibility?: number;
  vehicleAccessibility?: number;
  stoppingFeasibility?: number;
  concealmentOpportunity?: number;
  traceConsistency?: number;
  searchAdjustment?: number;
  uncertainty: [number, number];
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  assumptions: string[];
}

export type ScenarioClass =
  | 'homicide_near_pickup'
  | 'homicide_in_vehicle'
  | 'transport_to_private_location'
  | 'direct_transport_to_outdoor_site'
  | 'temporary_concealment_then_relocation'
  | 'vehicle_or_person_transfer'
  | 'water_associated_disposal'
  | 'unknown_sequence';

export interface ForensicScenario {
  id: string;
  title: string;
  scenarioClass: ScenarioClass;
  sequence: Array<{
    order: number;
    eventType:
      | 'pickup'
      | 'travel'
      | 'stop'
      | 'crime_event'
      | 'transfer'
      | 'temporary_concealment'
      | 'final_concealment'
      | 'return_to_observation';
    locationId?: string;
    earliestTime?: string;
    latestTime?: string;
    durationMinutes?: [number, number];
    explanation: string;
  }>;
  analyticalWeight: number;
  weightInterval: [number, number];
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  requiredAssumptions: string[];
  fragilityScore: number;
  unresolvedQuestions: string[];
}

export interface UnknownRegistryItem {
  id: string;
  title: string;
  detail: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ForensicCase {
  id: string;
  name: string;
  jurisdiction: string;
  timezone: string;
  cityOfDisappearance: string;
  evidence: EvidenceItem[];
  candidateZones: CandidateZone[];
  searches: SearchRecord[];
  unknowns: UnknownRegistryItem[];
  assumptions: ForensicAssumptionSet;
  guardrails: string[];
}

export interface ForensicAssumptionSet {
  middleRiverPriorWeight: number;
  podLow: number;
  podExpected: number;
  podHigh: number;
  evidenceDecay: number;
  timestampUncertaintyMinutes: number;
  minVehicleSpeedKmh: number;
  maxVehicleSpeedKmh: number;
  concealmentWeight: number;
  redactionImpactSensitivity: number;
  estimatedActivityMinutes: number;
  requiredReturnBufferMinutes: number;
}

export interface AuditReference {
  resultId: string;
  evidenceIds: string[];
  mechanismIds: string[];
  assumptions: string[];
  generatedBy: 'twin_a_gemini' | 'twin_b_hrm' | 'user';
  calculationVersion: string;
}

export interface ContradictionFinding {
  id: string;
  title: string;
  description: string;
  evidenceIds: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface ForensicOverlay {
  id: string;
  name: string;
  type:
    | 'twin_a_ranked_zones'
    | 'twin_b_ranked_zones'
    | 'twin_overlap'
    | 'twin_conflict'
    | 'posterior_fragility'
    | 'temporal_feasibility'
    | 'vehicle_accessibility'
    | 'prior_search_adjustment'
    | 'information_gain_recommendations';
  generatedBy: 'twin_a_gemini' | 'twin_b_hrm' | 'user';
  generatedAt: string;
  inputEvidenceIds: string[];
  calculationMethod: string;
  assumptions: string[];
  uncertainty: [number, number];
  isIllustrative: boolean;
  zoneScores: Array<{ zoneId: string; score: number }>;
}

export interface InformationGainAction {
  id: string;
  title: string;
  actionClass: 'records_request' | 'field_search';
  expectedEntropyReduction: number;
  feasibility: number;
  evidenceDiscrimination: number;
  safetyFactor: number;
  estimatedResourceCost: number;
  priorityScore: number;
  rationale: string;
}

export interface RouteHypothesis {
  id: string;
  title: string;
  sequence: string[];
  assumptions: string[];
  uncertainty: [number, number];
}

export interface ForensicTwinResult {
  twinId: 'twin_a' | 'twin_b';
  runId: string;
  caseId: string;
  startedAt: string;
  completedAt: string;
  caseSummary: {
    establishedFacts: string[];
    potentialEvidence: string[];
    disputedOrUnverifiedClaims: string[];
    criticalUnknowns: string[];
  };
  scenarios: ForensicScenario[];
  rankedZones: CandidateZone[];
  routeHypotheses: RouteHypothesis[];
  contradictions: ContradictionFinding[];
  recommendedActions: InformationGainAction[];
  limitations: string[];
  overlays: ForensicOverlay[];
  unknowns: UnknownRegistryItem[];
  mechanismLedger?: MechanismRoundLog[];
  auditReferences: AuditReference[];
  humanReviewRequired: boolean;
  uncertaintyStatement: string;
  unsupportedClaimCount: number;
  tokenUsage: number;
  latencyMs: number;
  isSynthetic: boolean;
}

export interface ForensicState {
  caseRecord: ForensicCase;
  zoneScores: Record<string, number>;
  zonePosteriors: Record<string, number>;
  scenarioScores: Record<string, number>;
  contradictions: ContradictionFinding[];
  assumptionFragility: Record<string, number>;
  round: number;
  warnings: string[];
}

export interface MechanismContext {
  nowIso: string;
  assumptions: ForensicAssumptionSet;
}

export interface MechanismProposal {
  mechanismId: string;
  zoneContributions: Array<{
    zoneId: string;
    logContribution: number;
    boundedScore: number;
    supportingEvidenceIds: string[];
    contradictingEvidenceIds: string[];
    assumptions: string[];
    explanation: string;
  }>;
  hypothesisContributions: Array<{
    hypothesisId: string;
    logContribution: number;
    supportingEvidenceIds: string[];
    contradictingEvidenceIds: string[];
  }>;
  contradictions: ContradictionFinding[];
  warnings: string[];
}

export interface ForensicMechanism {
  id: string;
  name: string;
  reads: readonly string[];
  writes: readonly string[];
  propose(snapshot: Readonly<ForensicState>, context: MechanismContext): MechanismProposal;
}

export interface MechanismRoundLog {
  round: number;
  snapshotHash: string;
  proposalValues: MechanismProposal[];
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  assumptions: string[];
  computedContribution: Record<string, number>;
  arbitrationDecision: string[];
  committedPosterior: Record<string, number>;
  stoppingReason?: string;
}

export interface RunForensicTwinsRequest {
  caseRecord: ForensicCase;
  settings: {
    model: string;
    temperature: number;
    maxHrmRounds: number;
    convergenceThreshold: number;
    includeIllustrativeZones: boolean;
  };
}

export interface TwinRunResponse {
  runId: string;
  caseId: string;
  startedAt: string;
  completedAt: string;
  twinA: ForensicTwinResult;
  twinB: ForensicTwinResult;
  comparison: {
    scenarioAgreement: number;
    zoneRankCorrelation: number;
    topZoneOverlap: string[];
    majorConflicts: string[];
    evidenceCoverage: {
      twinA: number;
      twinB: number;
    };
    unsupportedClaimCount: {
      twinA: number;
      twinB: number;
    };
    latencyMs: {
      twinA: number;
      twinB: number;
    };
    tokenUsage: {
      twinA: number;
      twinB: number;
    };
  };
}
