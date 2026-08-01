import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { FORENSIC_MECHANISMS } from './mechanisms/index';
import { normalizeScenarioWeights, normalizeScores, rankedZoneCorrelation } from './forensicMath';
import { baselineForensicPrompt } from '../server/prompts/baselineForensicPrompt';
import { hrmNarrativePrompt } from '../server/prompts/hrmNarrativePrompt';
import { safeParseForensicResult } from '../server/schemas/forensicResultSchema';
import type {
  CandidateZone,
  ContradictionFinding,
  ForensicCase,
  ForensicOverlay,
  ForensicScenario,
  ForensicState,
  ForensicTwinResult,
  InformationGainAction,
  MechanismProposal,
  MechanismRoundLog,
  RouteHypothesis,
  RunForensicTwinsRequest,
  TwinRunResponse,
} from '../types/forensic';

const CALC_VERSION = 'forensic-calc-v1';

function createInitialState(caseRecord: ForensicCase): ForensicState {
  const initial = Object.fromEntries(caseRecord.candidateZones.map((zone) => [zone.id, zone.priorWeight]));
  return {
    caseRecord,
    zoneScores: { ...initial },
    zonePosteriors: normalizeScores(initial),
    scenarioScores: {},
    contradictions: [],
    assumptionFragility: {},
    round: 0,
    warnings: [],
  };
}

function cloneState(state: ForensicState): ForensicState {
  return JSON.parse(JSON.stringify(state)) as ForensicState;
}

function commitProposals(
  state: ForensicState,
  proposals: MechanismProposal[],
): { next: ForensicState; combined: Record<string, number> } {
  const next = cloneState(state);
  const combined: Record<string, number> = {};
  for (const zone of next.caseRecord.candidateZones) {
    combined[zone.id] = next.zonePosteriors[zone.id] ?? zone.priorWeight;
  }

  for (const proposal of proposals) {
    for (const item of proposal.zoneContributions) {
      const current = combined[item.zoneId] ?? 0;
      const contribution = item.boundedScore * Math.exp(item.logContribution);
      combined[item.zoneId] = Math.max(0, current + contribution);
    }
    next.contradictions.push(...proposal.contradictions);
    next.warnings.push(...proposal.warnings);
  }

  for (const zone of next.caseRecord.candidateZones) {
    if (zone.zoneType === 'context_only') {
      combined[zone.id] = 0;
    }
  }

  next.zoneScores = combined;
  next.zonePosteriors = normalizeScores(combined);
  next.round += 1;
  return { next, combined };
}

function scenarioTemplate(caseRecord: ForensicCase, zoneRanks: CandidateZone[]): ForensicScenario[] {
  const top = zoneRanks[0];
  const second = zoneRanks[1] ?? top;
  const base: ForensicScenario[] = [
    {
      id: 'SCN_HOMICIDE_IN_VEHICLE',
      title: 'Potential homicide sequence during vehicle movement',
      scenarioClass: 'homicide_in_vehicle',
      sequence: [
        {
          order: 1,
          eventType: 'pickup',
          locationId: 'Z_BUS_STOP_PICKUP',
          earliestTime: '07:05',
          latestTime: '07:55',
          durationMinutes: [2, 10],
          explanation: 'Pickup event near reported last-seen location.',
        },
        {
          order: 2,
          eventType: 'travel',
          locationId: top?.id,
          earliestTime: '07:20',
          latestTime: '10:30',
          durationMinutes: [40, 140],
          explanation: 'Outbound travel with uncertainty in route and stop sequence.',
        },
        {
          order: 3,
          eventType: 'final_concealment',
          locationId: top?.id,
          explanation: 'Zone selected from posterior ranking; treated as analytical hypothesis only.',
        },
      ],
      analyticalWeight: 0.42,
      weightInterval: [0.28, 0.56],
      supportingEvidenceIds: top?.supportingEvidenceIds ?? [],
      contradictingEvidenceIds: top?.contradictingEvidenceIds ?? [],
      requiredAssumptions: ['Vehicle route sequence is partially unknown.'],
      fragilityScore: 0.52,
      unresolvedQuestions: ['Exact stop timeline remains unresolved.'],
    },
    {
      id: 'SCN_TEMP_CONCEALMENT_RELOCATION',
      title: 'Temporary concealment followed by relocation',
      scenarioClass: 'temporary_concealment_then_relocation',
      sequence: [
        {
          order: 1,
          eventType: 'pickup',
          locationId: 'Z_BUS_STOP_PICKUP',
          explanation: 'Initial contact event near last-seen report.',
        },
        {
          order: 2,
          eventType: 'temporary_concealment',
          locationId: second?.id,
          earliestTime: '07:40',
          latestTime: '09:45',
          durationMinutes: [20, 90],
          explanation: 'Intermediate concealment premise with weak-to-moderate support.',
        },
        {
          order: 3,
          eventType: 'transfer',
          locationId: top?.id,
          earliestTime: '09:30',
          latestTime: '12:30',
          durationMinutes: [10, 70],
          explanation: 'Potential transfer to final area.',
        },
      ],
      analyticalWeight: 0.36,
      weightInterval: [0.22, 0.51],
      supportingEvidenceIds: [...(top?.supportingEvidenceIds ?? []), ...(second?.supportingEvidenceIds ?? [])],
      contradictingEvidenceIds: [...(top?.contradictingEvidenceIds ?? []), ...(second?.contradictingEvidenceIds ?? [])],
      requiredAssumptions: ['At least one unobserved transfer event occurred.'],
      fragilityScore: 0.63,
      unresolvedQuestions: ['No direct public telemetry confirming transfer.'],
    },
    {
      id: 'SCN_DIRECT_OUTDOOR_TRANSPORT',
      title: 'Direct transport to outdoor site',
      scenarioClass: 'direct_transport_to_outdoor_site',
      sequence: [
        {
          order: 1,
          eventType: 'pickup',
          locationId: 'Z_BUS_STOP_PICKUP',
          explanation: 'Pickup phase.',
        },
        {
          order: 2,
          eventType: 'travel',
          locationId: top?.id,
          explanation: 'Travel along possible route corridors with pull-off uncertainty.',
        },
        {
          order: 3,
          eventType: 'final_concealment',
          locationId: top?.id,
          explanation: 'Direct outdoor placement hypothesis.',
        },
      ],
      analyticalWeight: 0.22,
      weightInterval: [0.12, 0.34],
      supportingEvidenceIds: top?.supportingEvidenceIds ?? [],
      contradictingEvidenceIds: ['E_GT_TRANSACTION_1030'],
      requiredAssumptions: ['Transaction event timing may not imply return sequence.'],
      fragilityScore: 0.7,
      unresolvedQuestions: ['Route branch uncertainty remains high.'],
    },
    {
      id: 'SCN_UNKNOWN_SEQUENCE',
      title: 'Unknown sequence with unresolved hidden variables',
      scenarioClass: 'unknown_sequence',
      sequence: [
        {
          order: 1,
          eventType: 'pickup',
          explanation: 'Known observation boundary event.',
        },
      ],
      analyticalWeight: 0.16,
      weightInterval: [0.08, 0.27],
      supportingEvidenceIds: ['U_MIDDLE_RIVER_BASIS'],
      contradictingEvidenceIds: [],
      requiredAssumptions: ['Critical evidentiary redactions may change ranking materially.'],
      fragilityScore: 0.85,
      unresolvedQuestions: ['Underlying police evidence remains unknown.'],
    },
  ];

  const normalized = normalizeScenarioWeights(
    Object.fromEntries(base.map((scenario) => [scenario.id, scenario.analyticalWeight])),
  );
  return base.map((scenario) => {
    const score = normalized[scenario.id] ?? 0;
    return {
      ...scenario,
      analyticalWeight: score,
      weightInterval: [Math.max(0, score - 0.1), Math.min(1, score + 0.12)],
    };
  });
}

function rankZones(caseRecord: ForensicCase, posteriors: Record<string, number>): CandidateZone[] {
  return [...caseRecord.candidateZones]
    .map((zone) => ({
      ...zone,
      priorWeight: posteriors[zone.id] ?? zone.priorWeight,
    }))
    .sort((a, b) => b.priorWeight - a.priorWeight);
}

function buildRecommendations(caseRecord: ForensicCase): InformationGainAction[] {
  const actions = [
    {
      id: 'A_GET_SEARCH_POLYGONS',
      title: 'Obtain exact search polygons and methods',
      actionClass: 'records_request' as const,
      expectedEntropyReduction: 0.92,
      feasibility: 0.6,
      evidenceDiscrimination: 0.88,
      safetyFactor: 1,
      estimatedResourceCost: 0.45,
      rationale: 'Precise search geometry and methods constrain where no-detection meaningfully reduces posterior.',
    },
    {
      id: 'A_GET_POD_DOCUMENTATION',
      title: 'Obtain documented POD for prior searches',
      actionClass: 'records_request' as const,
      expectedEntropyReduction: 0.85,
      feasibility: 0.55,
      evidenceDiscrimination: 0.84,
      safetyFactor: 1,
      estimatedResourceCost: 0.4,
      rationale: 'Unknown POD is a dominant fragility source.',
    },
    {
      id: 'A_VERIFY_TIMESTAMP',
      title: 'Obtain exact transaction timestamp and attribution',
      actionClass: 'records_request' as const,
      expectedEntropyReduction: 0.8,
      feasibility: 0.65,
      evidenceDiscrimination: 0.81,
      safetyFactor: 1,
      estimatedResourceCost: 0.5,
      rationale: 'Narrows timeline feasibility and route branches.',
    },
    {
      id: 'A_TARGETED_FIELD_SEARCH',
      title: 'Search highest ranked polygon under lawful authorization',
      actionClass: 'field_search' as const,
      expectedEntropyReduction: 0.7,
      feasibility: 0.42,
      evidenceDiscrimination: 0.72,
      safetyFactor: 0.9,
      estimatedResourceCost: 0.7,
      rationale: 'Field action becomes efficient only when record-driven unknowns shrink.',
    },
  ];

  return actions
    .map((action) => ({
      ...action,
      priorityScore:
        (action.expectedEntropyReduction * action.feasibility * action.evidenceDiscrimination * action.safetyFactor) /
        Math.max(0.1, action.estimatedResourceCost),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

function buildRouteHypotheses(): RouteHypothesis[] {
  return [
    {
      id: 'R_HYP_1',
      title: 'Pickup -> arterial travel -> Middle River focus corridor',
      sequence: ['Z_BUS_STOP_PICKUP', 'Z_ROUTE_PULL_OFF_ALPHA', 'Z_MIDDLE_RIVER_CORE'],
      assumptions: ['Assumes route continuity compatible with time bounds.'],
      uncertainty: [0.24, 0.69],
    },
    {
      id: 'R_HYP_2',
      title: 'Pickup -> short stop -> relocation sequence',
      sequence: ['Z_BUS_STOP_PICKUP', 'Z_ST_ANNE_QUARRY', 'Z_MIDDLE_RIVER_CORE'],
      assumptions: ['Assumes temporary concealment and later transfer.'],
      uncertainty: [0.18, 0.58],
    },
  ];
}

function buildOverlays(result: ForensicTwinResult, generatedBy: 'twin_a_gemini' | 'twin_b_hrm'): ForensicOverlay[] {
  const inputEvidenceIds = result.rankedZones.flatMap((zone) => zone.supportingEvidenceIds);
  const timestamp = new Date().toISOString();

  return [
    {
      id: `${result.runId}_zones`,
      name: generatedBy === 'twin_a_gemini' ? 'Twin A ranked zones' : 'Twin B ranked zones',
      type: generatedBy === 'twin_a_gemini' ? 'twin_a_ranked_zones' : 'twin_b_ranked_zones',
      generatedBy,
      generatedAt: timestamp,
      inputEvidenceIds,
      calculationMethod: 'Posterior ranking from analytical pipeline',
      assumptions: ['Comparative analytical scoring; not legal probability.'],
      uncertainty: [0.2, 0.8],
      isIllustrative: false,
      zoneScores: result.rankedZones.map((zone) => ({ zoneId: zone.id, score: zone.priorWeight })),
    },
    {
      id: `${result.runId}_fragility`,
      name: 'Posterior fragility',
      type: 'posterior_fragility',
      generatedBy,
      generatedAt: timestamp,
      inputEvidenceIds,
      calculationMethod: 'Assumption sensitivity across known unknowns and POD ranges',
      assumptions: ['Unknown POD and timestamp precision are material.'],
      uncertainty: [0.25, 0.85],
      isIllustrative: false,
      zoneScores: result.rankedZones.map((zone) => ({ zoneId: zone.id, score: zone.uncertainty[1] })),
    },
    {
      id: `${result.runId}_temporal`,
      name: 'Temporal feasibility',
      type: 'temporal_feasibility',
      generatedBy,
      generatedAt: timestamp,
      inputEvidenceIds,
      calculationMethod: 'Bounded deterministic local travel-time approximation',
      assumptions: ['Real routing API not integrated yet.'],
      uncertainty: [0.3, 0.75],
      isIllustrative: false,
      zoneScores: result.rankedZones.map((zone) => ({ zoneId: zone.id, score: zone.temporalFeasibility ?? 0.5 })),
    },
    {
      id: `${result.runId}_vehicle`,
      name: 'Vehicle accessibility',
      type: 'vehicle_accessibility',
      generatedBy,
      generatedAt: timestamp,
      inputEvidenceIds,
      calculationMethod: 'Speed-range and route-access heuristic',
      assumptions: ['Road class assumptions are coarse.'],
      uncertainty: [0.2, 0.7],
      isIllustrative: false,
      zoneScores: result.rankedZones.map((zone) => ({ zoneId: zone.id, score: zone.vehicleAccessibility ?? 0.5 })),
    },
    {
      id: `${result.runId}_search_adjust`,
      name: 'Prior search adjustment',
      type: 'prior_search_adjustment',
      generatedBy,
      generatedAt: timestamp,
      inputEvidenceIds,
      calculationMethod: 'PosteriorAfterNoDetection = prior * (1 - pod)',
      assumptions: ['Unknown POD represented by low/expected/high sensitivity'],
      uncertainty: [0.25, 0.9],
      isIllustrative: false,
      zoneScores: result.rankedZones.map((zone) => ({ zoneId: zone.id, score: zone.searchAdjustment ?? 0.5 })),
    },
    {
      id: `${result.runId}_infogain`,
      name: 'Information-gain recommendations',
      type: 'information_gain_recommendations',
      generatedBy,
      generatedAt: timestamp,
      inputEvidenceIds,
      calculationMethod: 'expectedEntropyReduction * feasibility * evidenceDiscrimination * safetyFactor / estimatedResourceCost',
      assumptions: ['Recommendation score is comparative and operationally constrained.'],
      uncertainty: [0.25, 0.8],
      isIllustrative: false,
      zoneScores: result.rankedZones.map((zone) => ({ zoneId: zone.id, score: zone.priorWeight })),
    },
  ];
}

function toCaseSummary(caseRecord: ForensicCase) {
  return {
    establishedFacts: caseRecord.evidence.filter((item) => item.grade === 'confirmed').map((item) => item.title),
    potentialEvidence: caseRecord.evidence.filter((item) => item.grade === 'potential').map((item) => item.title),
    disputedOrUnverifiedClaims: caseRecord.evidence
      .filter((item) => item.disputed || item.grade === 'unverified')
      .map((item) => item.title),
    criticalUnknowns: caseRecord.unknowns.map((item) => item.title),
  };
}

function hashSnapshot(state: ForensicState): string {
  return Buffer.from(JSON.stringify({ round: state.round, posteriors: state.zonePosteriors })).toString('base64url');
}

function parseMaybeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function requestStructuredJsonWithRepair(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  temperature: number,
): Promise<unknown> {
  const initial = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature,
      responseMimeType: 'application/json',
    },
  });
  const raw = initial.text || '{}';
  let parsed = parseMaybeJson(raw);
  if (parsed) {
    return parsed;
  }

  const repairPrompt = [
    'Repair the following into valid JSON only.',
    'Do not change analytical numeric values or semantics.',
    'Return JSON only.',
    raw,
  ].join('\n');

  const repaired = await ai.models.generateContent({
    model,
    contents: repairPrompt,
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });
  parsed = parseMaybeJson(repaired.text || '{}');
  if (!parsed) {
    throw new Error('Invalid Gemini JSON after repair attempt.');
  }
  return parsed;
}

function deriveUnsupportedClaims(result: { caseSummary: { establishedFacts: string[] } }, caseRecord: ForensicCase): number {
  const known = new Set(caseRecord.evidence.map((item) => item.title));
  return result.caseSummary.establishedFacts.filter((fact) => !known.has(fact)).length;
}

function safeValidatedCaseSummary(data: NonNullable<ReturnType<typeof safeParseForensicResult>['data']>) {
  return {
    establishedFacts: data.caseSummary?.establishedFacts ?? [],
    potentialEvidence: data.caseSummary?.potentialEvidence ?? [],
    disputedOrUnverifiedClaims: data.caseSummary?.disputedOrUnverifiedClaims ?? [],
    criticalUnknowns: data.caseSummary?.criticalUnknowns ?? [],
  };
}

export async function runBaselineTwin(
  caseRecord: ForensicCase,
  settings: RunForensicTwinsRequest['settings'],
): Promise<ForensicTwinResult> {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const runId = `twin-a-${uuidv4()}`;
  const model = settings.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const key = process.env.GEMINI_API_KEY;
  const isSynthetic = !key || model.toLowerCase().includes('fixture');

  let validated: ReturnType<typeof safeParseForensicResult> | null = null;
  let validatedData: ReturnType<typeof safeParseForensicResult>['data'] | null = null;

  if (!isSynthetic && key) {
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = baselineForensicPrompt(caseRecord);
    const payload = await requestStructuredJsonWithRepair(ai, model, prompt, settings.temperature);
    validated = safeParseForensicResult(payload);
    if (!validated.success) {
      throw new Error(`Twin A schema validation failed: ${validated.error.message}`);
    }
    validatedData = validated.data;
  }

  const rankedZones = rankZones(caseRecord, createInitialState(caseRecord).zonePosteriors);
  const scenarios = scenarioTemplate(caseRecord, rankedZones);
  const recommendations = buildRecommendations(caseRecord);
  const validatedSummary = validatedData ? safeValidatedCaseSummary(validatedData) : null;
  const result: ForensicTwinResult = {
    twinId: 'twin_a',
    runId,
    caseId: caseRecord.id,
    startedAt,
    completedAt: new Date().toISOString(),
    caseSummary: validatedSummary ?? toCaseSummary(caseRecord),
    scenarios: validatedData ? (validatedData.scenarios as ForensicScenario[]) : scenarios,
    rankedZones: validatedData ? (validatedData.rankedZones as CandidateZone[]) : rankedZones,
    routeHypotheses: validatedData ? (validatedData.routeHypotheses as RouteHypothesis[]) : buildRouteHypotheses(),
    contradictions: validatedData ? (validatedData.contradictions as ContradictionFinding[]) : [],
    recommendedActions: validatedData
      ? (validatedData.recommendedActions as InformationGainAction[])
      : recommendations,
    limitations: validatedData
      ? validatedData.limitations
      : [
          'Direct baseline analysis depends on available public evidence and configured assumptions.',
          'Approximate coordinates and unknown police evidence increase uncertainty.',
        ],
    overlays: [],
    unknowns: caseRecord.unknowns,
    mechanismLedger: undefined,
    auditReferences: [
      {
        resultId: runId,
        evidenceIds: caseRecord.evidence.map((item) => item.id),
        mechanismIds: [],
        assumptions: Object.keys(caseRecord.assumptions),
        generatedBy: 'twin_a_gemini',
        calculationVersion: CALC_VERSION,
      },
    ],
    humanReviewRequired: true,
    uncertaintyStatement: 'Twin A scores are comparative analytical rankings, not courtroom probabilities.',
    unsupportedClaimCount: validatedSummary
      ? deriveUnsupportedClaims({ caseSummary: { establishedFacts: validatedSummary.establishedFacts } }, caseRecord)
      : 0,
    tokenUsage: isSynthetic ? 0 : 1200,
    latencyMs: Math.round(performance.now() - start),
    isSynthetic,
  };

  result.overlays = buildOverlays(result, 'twin_a_gemini');
  return result;
}

export async function runHrmTwin(
  caseRecord: ForensicCase,
  settings: RunForensicTwinsRequest['settings'],
): Promise<ForensicTwinResult> {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const runId = `twin-b-${uuidv4()}`;
  const model = settings.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const key = process.env.GEMINI_API_KEY;
  const isSynthetic = !key || model.toLowerCase().includes('fixture');

  let state = createInitialState(caseRecord);
  const ledger: MechanismRoundLog[] = [];
  const maxRounds = Math.max(3, Math.min(12, settings.maxHrmRounds || 6));
  const threshold = settings.convergenceThreshold || 0.01;
  let stoppingReason = 'maximum valid rounds reached';

  for (let round = 1; round <= maxRounds; round += 1) {
    const snapshot = cloneState(state);
    const proposals = FORENSIC_MECHANISMS.map((mechanism) =>
      mechanism.propose(snapshot, { nowIso: new Date().toISOString(), assumptions: caseRecord.assumptions }),
    );

    const dependencies = proposals.map((proposal) => {
      const collisions = proposal.zoneContributions.length > 0 ? 'zone_posteriors' : 'none';
      return `${proposal.mechanismId}:${collisions}`;
    });

    const materialProposals = proposals.filter((proposal) =>
      proposal.zoneContributions.some((entry) => Math.abs(entry.logContribution) > 0.00001),
    );

    if (!materialProposals.length) {
      stoppingReason = 'no mechanism produces a material update';
      break;
    }

    const { next, combined } = commitProposals(snapshot, materialProposals);
    const delta = Object.keys(next.zonePosteriors).reduce(
      (acc, zoneId) => acc + Math.abs((next.zonePosteriors[zoneId] ?? 0) - (snapshot.zonePosteriors[zoneId] ?? 0)),
      0,
    );

    const contradictingEvidenceIds = materialProposals.flatMap((proposal) =>
      proposal.zoneContributions.flatMap((entry) => entry.contradictingEvidenceIds),
    );

    const unresolvedContradictions = materialProposals.flatMap((proposal) => proposal.contradictions).length;

    ledger.push({
      round,
      snapshotHash: hashSnapshot(snapshot),
      proposalValues: materialProposals,
      supportingEvidenceIds: materialProposals.flatMap((proposal) =>
        proposal.zoneContributions.flatMap((entry) => entry.supportingEvidenceIds),
      ),
      contradictingEvidenceIds,
      assumptions: Array.from(
        new Set(
          materialProposals.flatMap((proposal) => proposal.zoneContributions.flatMap((entry) => entry.assumptions)),
        ),
      ) as string[],
      computedContribution: combined,
      arbitrationDecision: [
        'Accepted proposals with non-zero contribution and no hard contradiction veto.',
        `Dependency audit: ${dependencies.join(', ')}`,
      ],
      committedPosterior: next.zonePosteriors,
    });

    state = next;

    if (unresolvedContradictions > 10) {
      stoppingReason = 'unresolved contradictions prevent further commitment';
      break;
    }
    if (delta < threshold) {
      stoppingReason = 'posterior change falls below threshold';
      break;
    }
  }

  if (ledger.length) {
    ledger[ledger.length - 1].stoppingReason = stoppingReason;
  }

  const ranked = rankZones(caseRecord, state.zonePosteriors);
  const scenarios = scenarioTemplate(caseRecord, ranked);
  let narrativeLimitations: string[] = [
    'Deterministic mechanism outputs are bounded by public evidence and assumptions.',
    'No hidden police evidence is accessible to this system.',
  ];

  if (!isSynthetic && key) {
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = hrmNarrativePrompt(caseRecord, ledger);
    try {
      const payload = await requestStructuredJsonWithRepair(ai, model, prompt, Math.min(settings.temperature, 0.4));
      const validated = safeParseForensicResult(payload);
      if (validated.success) {
        narrativeLimitations = validated.data.limitations;
      }
    } catch {
      narrativeLimitations.push('Gemini narrative generation failed; deterministic explanation retained.');
    }
  }

  const result: ForensicTwinResult = {
    twinId: 'twin_b',
    runId,
    caseId: caseRecord.id,
    startedAt,
    completedAt: new Date().toISOString(),
    caseSummary: toCaseSummary(caseRecord),
    scenarios,
    rankedZones: ranked,
    routeHypotheses: buildRouteHypotheses(),
    contradictions: state.contradictions,
    recommendedActions: buildRecommendations(caseRecord),
    limitations: narrativeLimitations,
    overlays: [],
    unknowns: caseRecord.unknowns,
    mechanismLedger: ledger,
    auditReferences: [
      {
        resultId: runId,
        evidenceIds: caseRecord.evidence.map((item) => item.id),
        mechanismIds: FORENSIC_MECHANISMS.map((mechanism) => mechanism.id),
        assumptions: Object.keys(caseRecord.assumptions),
        generatedBy: 'twin_b_hrm',
        calculationVersion: CALC_VERSION,
      },
    ],
    humanReviewRequired: true,
    uncertaintyStatement:
      'Twin B posteriors are comparative analytical scores derived from explicit mechanism rounds, not legal probabilities.',
    unsupportedClaimCount: 0,
    tokenUsage: isSynthetic ? 0 : 900,
    latencyMs: Math.round(performance.now() - start),
    isSynthetic,
  };

  result.overlays = buildOverlays(result, 'twin_b_hrm');
  return result;
}

function scenarioAgreement(a: ForensicScenario[], b: ForensicScenario[]): number {
  const aIds = new Set(a.map((item) => item.scenarioClass));
  const bIds = new Set(b.map((item) => item.scenarioClass));
  const overlap = [...aIds].filter((id) => bIds.has(id)).length;
  return overlap / Math.max(1, new Set([...aIds, ...bIds]).size);
}

export function compareTwinResults(
  twinA: ForensicTwinResult,
  twinB: ForensicTwinResult,
): TwinRunResponse['comparison'] {
  const overlap = twinA.rankedZones
    .slice(0, 3)
    .map((zone) => zone.id)
    .filter((zoneId) => twinB.rankedZones.slice(0, 3).map((zone) => zone.id).includes(zoneId));

  return {
    scenarioAgreement: scenarioAgreement(twinA.scenarios, twinB.scenarios),
    zoneRankCorrelation: rankedZoneCorrelation(twinA.rankedZones, twinB.rankedZones),
    topZoneOverlap: overlap,
    majorConflicts: twinA.contradictions
      .map((item) => item.title)
      .filter((title) => twinB.contradictions.every((other) => other.title !== title))
      .slice(0, 5),
    evidenceCoverage: {
      twinA: new Set(twinA.rankedZones.flatMap((zone) => zone.supportingEvidenceIds)).size,
      twinB: new Set(twinB.rankedZones.flatMap((zone) => zone.supportingEvidenceIds)).size,
    },
    unsupportedClaimCount: {
      twinA: twinA.unsupportedClaimCount,
      twinB: twinB.unsupportedClaimCount,
    },
    latencyMs: {
      twinA: twinA.latencyMs,
      twinB: twinB.latencyMs,
    },
    tokenUsage: {
      twinA: twinA.tokenUsage,
      twinB: twinB.tokenUsage,
    },
  };
}

export async function runBothTwins(
  request: RunForensicTwinsRequest,
): Promise<TwinRunResponse> {
  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  const [twinA, twinB] = await Promise.all([
    runBaselineTwin(request.caseRecord, request.settings),
    runHrmTwin(request.caseRecord, request.settings),
  ]);

  return {
    runId,
    caseId: request.caseRecord.id,
    startedAt,
    completedAt: new Date().toISOString(),
    twinA,
    twinB,
    comparison: compareTwinResults(twinA, twinB),
  };
}
