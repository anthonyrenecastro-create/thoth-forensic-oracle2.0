import { useState } from 'react';
import type { ForensicCase, RunForensicTwinsRequest, TwinRunResponse } from '../../types/forensic';

interface Props {
  caseRecord: ForensicCase;
  settings: RunForensicTwinsRequest['settings'];
  onSettingsChange: (next: RunForensicTwinsRequest['settings']) => void;
  onRunComplete: (result: TwinRunResponse) => void;
  onAssumptionChange: (key: keyof ForensicCase['assumptions'], value: number) => void;
  runInvalidated: boolean;
  onExport: () => void;
  onExportPdf: () => void;
}

const assumptionFields: Array<{
  key: keyof ForensicCase['assumptions'];
  min: number;
  max: number;
  step: number;
  label: string;
}> = [
  { key: 'middleRiverPriorWeight', min: 0, max: 1, step: 0.01, label: 'Middle River prior weight' },
  { key: 'podLow', min: 0.01, max: 0.95, step: 0.01, label: 'POD low' },
  { key: 'podExpected', min: 0.01, max: 0.95, step: 0.01, label: 'POD expected' },
  { key: 'podHigh', min: 0.01, max: 0.99, step: 0.01, label: 'POD high' },
  { key: 'evidenceDecay', min: 0, max: 1, step: 0.01, label: 'Evidence-decay assumption' },
  { key: 'timestampUncertaintyMinutes', min: 0, max: 120, step: 1, label: 'Timestamp uncertainty (minutes)' },
  { key: 'minVehicleSpeedKmh', min: 10, max: 120, step: 1, label: 'Min vehicle speed (km/h)' },
  { key: 'maxVehicleSpeedKmh', min: 20, max: 140, step: 1, label: 'Max vehicle speed (km/h)' },
  { key: 'concealmentWeight', min: 0, max: 1, step: 0.01, label: 'Concealment weighting' },
  { key: 'redactionImpactSensitivity', min: 0, max: 1, step: 0.01, label: 'Redaction-impact sensitivity' },
];

export function TwinRunControls({
  caseRecord,
  settings,
  onSettingsChange,
  onRunComplete,
  onAssumptionChange,
  runInvalidated,
  onExport,
  onExportPdf,
}: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const runBoth = async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    setRunError(null);
    try {
      const response = await fetch('/api/forensic/run-twins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseRecord, settings }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error || `Run failed with HTTP ${response.status}`);
      }

      const payload = (await response.json()) as TwinRunResponse;
      onRunComplete(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown run error';
      setRunError(message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-60"
          onClick={runBoth}
          disabled={isRunning}
        >
          {isRunning ? 'Running Twins...' : 'Run Both Twins'}
        </button>
        <button type="button" className="px-4 py-2 rounded bg-emerald-700 text-white" onClick={onExport}>
          Export Results JSON
        </button>
        <button type="button" className="px-4 py-2 rounded bg-indigo-700 text-white" onClick={onExportPdf}>
          Export Forensic Audit PDF
        </button>
      </div>
      {runError && <div className="text-sm text-rose-700">Run failed: {runError}</div>}
      {runInvalidated && <div className="text-sm text-red-700">Assumptions changed. Previous result is invalid until rerun.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <label className="text-sm">
          Gemini model
          <input
            value={settings.model}
            onChange={(event) => onSettingsChange({ ...settings, model: event.target.value })}
            className="w-full border border-slate-300 rounded px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Temperature
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={settings.temperature}
            onChange={(event) => onSettingsChange({ ...settings, temperature: Number(event.target.value) })}
            className="w-full border border-slate-300 rounded px-2 py-1"
          />
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {assumptionFields.map((field) => (
          <div key={field.key} className="bg-slate-50 border border-slate-200 rounded p-2 text-sm">
            <label className="block font-semibold">{field.label}</label>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={caseRecord.assumptions[field.key] as number}
              onChange={(event) => {
                const next = Number(event.target.value);
                onAssumptionChange(field.key, next);
              }}
              className="w-full"
            />
            <div>Value: {(caseRecord.assumptions[field.key] as number).toFixed(2)}</div>
            <div>Source: user assumption</div>
            <div>Status: not verified</div>
            <div>Effect: changes posterior</div>
          </div>
        ))}
      </div>
    </section>
  );
}
