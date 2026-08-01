import { z } from 'zod';

export const forensicResultSchema = z.object({
  caseSummary: z.object({
    establishedFacts: z.array(z.string()),
    potentialEvidence: z.array(z.string()),
    disputedOrUnverifiedClaims: z.array(z.string()),
    criticalUnknowns: z.array(z.string()),
  }),
  scenarios: z.array(z.any()),
  rankedZones: z.array(z.any()),
  routeHypotheses: z.array(z.any()),
  contradictions: z.array(z.any()),
  recommendedActions: z.array(z.any()),
  limitations: z.array(z.string()),
  humanReviewRequired: z.boolean(),
});

export type ForensicResultSchemaType = z.infer<typeof forensicResultSchema>;

export function safeParseForensicResult(payload: unknown) {
  return forensicResultSchema.safeParse(payload);
}
