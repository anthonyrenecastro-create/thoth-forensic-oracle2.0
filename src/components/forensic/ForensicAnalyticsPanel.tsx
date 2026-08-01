import { useMemo } from 'react';
import type { ForensicCase, TwinRunResponse } from '../../types/forensic';
import {
  buildBayesianWaterfall,
  buildEvidenceCorrelationMatrix,
  buildPodShift,
  buildSensitivityTornado,
  calibrateEvidenceReliability,
  runMonteCarloUncertainty,
} from '../../engine/forensicAnalytics';

interface Props {
  caseRecord: ForensicCase;
  latestRun: TwinRunResponse | null;
}

function escapeCsv(value: string | number) {
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(headers: string[], rows: Array<Array<string | number>>) {
  return [headers.map((item) => escapeCsv(item)).join(','), ...rows.map((row) => row.map((item) => escapeCsv(item)).join(','))].join('\n');
}

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function barWidth(value: number, scale = 100) {
  return `${Math.max(3, Math.min(scale, Math.abs(value) * scale))}%`;
}

function correlationTone(value: number) {
  if (value >= 0.6) {
    return 'bg-emerald-200';
  }
  if (value >= 0.2) {
    return 'bg-emerald-100';
  }
  if (value <= -0.6) {
    return 'bg-rose-200';
  }
  if (value <= -0.2) {
    return 'bg-rose-100';
  }
  return 'bg-slate-100';
}

export function ForensicAnalyticsPanel({ caseRecord, latestRun }: Props) {
  const ranking = latestRun?.twinB.rankedZones ?? caseRecord.candidateZones;
  const sensitivity = useMemo(() => buildSensitivityTornado(caseRecord, ranking), [caseRecord, ranking]);
  const monteCarlo = useMemo(() => runMonteCarloUncertainty(ranking, caseRecord.assumptions), [ranking, caseRecord.assumptions]);
  const waterfall = useMemo(() => buildBayesianWaterfall(caseRecord.evidence), [caseRecord.evidence]);
  const calibration = useMemo(() => calibrateEvidenceReliability(caseRecord.evidence), [caseRecord.evidence]);
  const podShift = useMemo(
    () => buildPodShift(ranking.slice(0, 5), [caseRecord.assumptions.podLow, caseRecord.assumptions.podExpected, caseRecord.assumptions.podHigh]),
    [ranking, caseRecord.assumptions],
  );
  const corr = useMemo(() => buildEvidenceCorrelationMatrix(caseRecord), [caseRecord]);

  const exportMonteCarloCsv = () => {
    const headers = ['zone_id', 'zone_name', 'sample_index', 'posterior_sample', 'mean', 'low_p10', 'high_p90'];
    const rows = monteCarlo.flatMap((zone) =>
      zone.values.map((value, index) => [
        zone.zoneId,
        zone.name,
        index + 1,
        value.toFixed(6),
        zone.mean.toFixed(6),
        zone.low.toFixed(6),
        zone.high.toFixed(6),
      ]),
    );
    const csv = toCsv(headers, rows);
    downloadCsv(`${caseRecord.id}-monte-carlo-samples.csv`, csv);
  };

  const exportPodShiftCsv = () => {
    const headers = ['zone_id', 'zone_name', 'prior', 'pod_low_adjusted', 'pod_expected_adjusted', 'pod_high_adjusted'];
    const rows = podShift.map((item) => [
      item.zoneId,
      item.name,
      item.prior.toFixed(6),
      item.low.toFixed(6),
      item.expected.toFixed(6),
      item.high.toFixed(6),
    ]);
    const csv = toCsv(headers, rows);
    downloadCsv(`${caseRecord.id}-pod-shift.csv`, csv);
  };

  const exportCalibrationCsv = () => {
    const headers = ['evidence_id', 'evidence_title', 'alpha', 'beta', 'mean', 'variance'];
    const rows = calibration.map((item) => [
      item.evidenceId,
      item.title,
      item.alpha.toFixed(6),
      item.beta.toFixed(6),
      item.mean.toFixed(6),
      item.variance.toFixed(8),
    ]);
    const csv = toCsv(headers, rows);
    downloadCsv(`${caseRecord.id}-reliability-calibration.csv`, csv);
  };

  return (
    <section className="border border-slate-300 rounded-lg bg-white p-3 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">Advanced Forensic Analytics</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportMonteCarloCsv}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-medium hover:bg-slate-50"
          >
            Export Monte Carlo CSV
          </button>
          <button
            type="button"
            onClick={exportPodShiftCsv}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-medium hover:bg-slate-50"
          >
            Export POD Shift CSV
          </button>
          <button
            type="button"
            onClick={exportCalibrationCsv}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-medium hover:bg-slate-50"
          >
            Export Calibration CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="border border-slate-200 rounded p-3 space-y-2">
          <h4 className="font-semibold">Sensitivity Tornado (Top-Zone Delta)</h4>
          <div className="space-y-2 text-xs">
            {sensitivity.map((row) => (
              <div key={String(row.key)} className="space-y-1">
                <div className="flex justify-between">
                  <span>{row.label}</span>
                  <span>{row.lowDelta.toFixed(3)} to {row.highDelta.toFixed(3)}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="bg-rose-100 h-2 rounded" style={{ width: barWidth(row.lowDelta) }} />
                  <div className="bg-emerald-100 h-2 rounded justify-self-end" style={{ width: barWidth(row.highDelta) }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-slate-200 rounded p-3 space-y-2">
          <h4 className="font-semibold">Monte Carlo Posterior Envelope</h4>
          <div className="space-y-2 text-xs">
            {monteCarlo.slice(0, 4).map((zone) => (
              <div key={zone.zoneId}>
                <div className="flex justify-between">
                  <span>{zone.name}</span>
                  <span>mean {zone.mean.toFixed(3)} [{zone.low.toFixed(3)}, {zone.high.toFixed(3)}]</span>
                </div>
                <div className="h-2 bg-slate-100 rounded overflow-hidden">
                  <div className="h-full bg-sky-400" style={{ width: `${Math.min(100, zone.mean * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="border border-slate-200 rounded p-3 space-y-2">
          <h4 className="font-semibold">Bayesian Evidence Updating Waterfall</h4>
          <div className="space-y-2 text-xs max-h-64 overflow-auto">
            {waterfall.map((step) => (
              <div key={step.evidenceId} className="border border-slate-100 rounded p-2">
                <div className="font-medium">{step.title}</div>
                <div>Posterior: {step.previous.toFixed(3)} → {step.next.toFixed(3)} ({step.delta >= 0 ? '+' : ''}{step.delta.toFixed(3)})</div>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-slate-200 rounded p-3 space-y-2">
          <h4 className="font-semibold">POD-Adjusted Probability Shift</h4>
          <div className="space-y-2 text-xs">
            {podShift.map((item) => (
              <div key={item.zoneId}>
                <div className="font-medium">{item.name}</div>
                <div>Prior {item.prior.toFixed(3)} | Low POD {item.low.toFixed(3)} | Expected POD {item.expected.toFixed(3)} | High POD {item.high.toFixed(3)}</div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="border border-slate-200 rounded p-3 space-y-2">
          <h4 className="font-semibold">Reliability Calibration (Beta Priors)</h4>
          <div className="overflow-auto max-h-64">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="text-left p-1">Evidence</th>
                  <th className="text-left p-1">alpha</th>
                  <th className="text-left p-1">beta</th>
                  <th className="text-left p-1">mean</th>
                </tr>
              </thead>
              <tbody>
                {calibration.map((item) => (
                  <tr key={item.evidenceId} className="border-t border-slate-200">
                    <td className="p-1">{item.title}</td>
                    <td className="p-1">{item.alpha.toFixed(2)}</td>
                    <td className="p-1">{item.beta.toFixed(2)}</td>
                    <td className="p-1">{item.mean.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="border border-slate-200 rounded p-3 space-y-2">
          <h4 className="font-semibold">Evidence Correlation Matrix</h4>
          <div className="space-y-1 text-xs">
            {corr.map((row) => (
              <div key={row.metric} className="grid grid-cols-4 gap-1 items-center">
                <div className="font-medium">{row.metric}</div>
                {row.correlations.map((cell) => (
                  <div key={`${row.metric}_${cell.metric}`} className={`rounded px-2 py-1 ${correlationTone(cell.value)}`}>
                    {cell.metric}: {cell.value.toFixed(2)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
