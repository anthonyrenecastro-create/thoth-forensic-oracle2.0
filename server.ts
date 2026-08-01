import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import pino from 'pino';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { MADISON_CASE } from './src/data/madisonCase';
import { runBaselineTwin, runBothTwins, runHrmTwin } from './src/engine/forensicTwin';
import type { ForensicCase, RunForensicTwinsRequest, TwinRunResponse } from './src/types/forensic';

dotenv.config();

const app = express();
const PORT = 3000;
const logger = pino({
  redact: ['req.headers.authorization', '*.apiKey', '*.token', '*.password', '*.secret'],
});

app.use(express.json({ limit: '2mb' }));

const runStore = new Map<string, TwinRunResponse>();

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const runTwinsSchema = {
  type: 'object',
  required: ['caseRecord', 'settings'],
  properties: {
    caseRecord: {
      type: 'object',
      required: ['id', 'name', 'evidence', 'candidateZones', 'searches', 'unknowns', 'assumptions'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        evidence: { type: 'array', maxItems: 1000 },
        candidateZones: { type: 'array', maxItems: 500 },
        searches: { type: 'array', maxItems: 200 },
        unknowns: { type: 'array', maxItems: 300 },
        assumptions: { type: 'object' },
      },
      additionalProperties: true,
    },
    settings: {
      type: 'object',
      required: ['model', 'temperature', 'maxHrmRounds', 'convergenceThreshold', 'includeIllustrativeZones'],
      properties: {
        model: { type: 'string' },
        temperature: { type: 'number', minimum: 0, maximum: 2 },
        maxHrmRounds: { type: 'number', minimum: 1, maximum: 40 },
        convergenceThreshold: { type: 'number', minimum: 0, maximum: 1 },
        includeIllustrativeZones: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

const validateRunTwins = ajv.compile(runTwinsSchema);

const rateState = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 45;

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const current = rateState.get(ip);
  if (!current || current.resetAt < now) {
    rateState.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return next();
  }
  if (current.count >= RATE_MAX) {
    return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
  }
  current.count += 1;
  return next();
}

app.use('/api/forensic', rateLimit);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    fixtureModeAvailable: true,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/forensic/cases/default', (_req, res) => {
  res.json({ caseRecord: MADISON_CASE });
});

app.post('/api/forensic/cases/validate', (req, res) => {
  const payload = req.body as Partial<{ caseRecord: ForensicCase }>;
  if (!payload.caseRecord) {
    return res.status(400).json({ valid: false, errors: ['Missing caseRecord'] });
  }

  const fakeRequest: RunForensicTwinsRequest = {
    caseRecord: payload.caseRecord,
    settings: {
      model: 'fixture',
      temperature: 0,
      maxHrmRounds: 6,
      convergenceThreshold: 0.02,
      includeIllustrativeZones: false,
    },
  };

  const valid = validateRunTwins(fakeRequest);
  if (!valid) {
    return res.status(400).json({ valid: false, errors: validateRunTwins.errors });
  }

  const totalEvidenceSize = JSON.stringify(payload.caseRecord.evidence || []).length;
  if (totalEvidenceSize > 750_000) {
    return res.status(400).json({ valid: false, errors: ['Evidence payload exceeds maximum size.'] });
  }

  return res.json({ valid: true, warnings: [] });
});

app.post('/api/forensic/run-baseline', async (req, res) => {
  const payload = req.body as RunForensicTwinsRequest;
  if (!validateRunTwins(payload)) {
    return res.status(400).json({ error: 'Invalid request', details: validateRunTwins.errors });
  }

  try {
    const result = await runBaselineTwin(payload.caseRecord, payload.settings);
    return res.json(result);
  } catch (error) {
    logger.error({ error }, 'run-baseline failed');
    return res.status(500).json({ error: 'Baseline twin execution failed.' });
  }
});

app.post('/api/forensic/run-hrm', async (req, res) => {
  const payload = req.body as RunForensicTwinsRequest;
  if (!validateRunTwins(payload)) {
    return res.status(400).json({ error: 'Invalid request', details: validateRunTwins.errors });
  }

  try {
    const result = await runHrmTwin(payload.caseRecord, payload.settings);
    return res.json(result);
  } catch (error) {
    logger.error({ error }, 'run-hrm failed');
    return res.status(500).json({ error: 'HRM twin execution failed.' });
  }
});

app.post('/api/forensic/run-twins', async (req, res) => {
  const payload = req.body as RunForensicTwinsRequest;
  if (!validateRunTwins(payload)) {
    return res.status(400).json({ error: 'Invalid request', details: validateRunTwins.errors });
  }

  const totalEvidenceSize = JSON.stringify(payload.caseRecord.evidence || []).length;
  if (totalEvidenceSize > 750_000) {
    return res.status(400).json({ error: 'Evidence payload exceeds maximum size.' });
  }

  try {
    const result = await runBothTwins(payload);
    runStore.set(result.runId, result);
    return res.json(result);
  } catch (error) {
    logger.error({ error }, 'run-twins failed');
    return res.status(500).json({ error: 'Twin execution failed.' });
  }
});

app.get('/api/forensic/runs/:runId', (req, res) => {
  const { runId } = req.params;
  const run = runStore.get(runId);
  if (!run) {
    return res.status(404).json({ error: 'Run ID not found.' });
  }
  return res.json(run);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, 'THOTH Forensic Twin Arena server listening');
  });
}

startServer();
