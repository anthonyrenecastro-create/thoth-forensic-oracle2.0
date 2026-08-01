import React from 'react';
import { BaselineSolverResponse, HRMSolverResponse, ARCGrid, ARCBenchmarkRecord } from '../types/arc';
import { gridsEqual, cellAccuracy } from '../engine/arcEvaluation';

interface ComparisonScoreboardProps {
  baseline: BaselineSolverResponse | null;
  hrm: HRMSolverResponse | null;
  expectedGrid?: ARCGrid;
  history?: ARCBenchmarkRecord[];
}

export const ComparisonScoreboard: React.FC<ComparisonScoreboardProps> = ({
  baseline,
  hrm,
  expectedGrid,
  history = []
}) => {
  if (!baseline || !hrm) return null;

  const bExact = expectedGrid ? gridsEqual(baseline.predictedOutput, expectedGrid) : null;
  const hExact = expectedGrid ? gridsEqual(hrm.predictedOutput, expectedGrid) : null;

  const bAcc = expectedGrid ? cellAccuracy(baseline.predictedOutput, expectedGrid) : 100;
  const hAcc = expectedGrid ? cellAccuracy(hrm.predictedOutput, expectedGrid) : 100;

  const speedWinner = baseline.metrics.latencyMs! < hrm.metrics.latencyMs! ? 'Twin A (Baseline)' : 'Twin B (HRM)';
  const tokenWinner = baseline.metrics.totalTokens < hrm.metrics.totalTokens ? 'Twin A (Baseline)' : 'Twin B (HRM)';

  let correctnessWinner = 'Tie';
  if (bExact !== null && hExact !== null) {
    if (bExact && !hExact) correctnessWinner = 'Twin A (Baseline)';
    else if (!bExact && hExact) correctnessWinner = 'Twin B (HRM)';
    else if (bAcc > hAcc) correctnessWinner = 'Twin A (Baseline)';
    else if (hAcc > bAcc) correctnessWinner = 'Twin B (HRM)';
  }

  const overallWinner = hExact && !bExact ? 'Twin B (HRM)' : bExact && !hExact ? 'Twin A (Baseline)' : hAcc >= bAcc ? 'Twin B (HRM)' : 'Twin A (Baseline)';

  // Calculate cumulative win tally from history
  let twinAWins = 0;
  let twinBWins = 0;
  history.forEach(rec => {
    if (rec.winner.overall.includes('Twin A')) twinAWins++;
    else if (rec.winner.overall.includes('Twin B')) twinBWins++;
  });
  if (!history.some(r => r.baseline.totalTokens === baseline.metrics.totalTokens && r.hrm.totalTokens === hrm.metrics.totalTokens)) {
    if (overallWinner.includes('Twin A')) twinAWins++;
    else twinBWins++;
  }

  return (
    <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Benchmark Comparison & Scoreboard
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            Rounds Played: <strong className="text-white">{hrm.reasoningRounds}</strong>
          </span>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
            Match Score — Twin A: {twinAWins} | Twin B: {twinBWins}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-zinc-500">Correctness Winner</span>
          <span className="text-sm font-bold text-cyan-300 mt-1">{correctnessWinner}</span>
          <span className="text-[10px] text-zinc-400 mt-1">
            {expectedGrid ? (hExact ? 'HRM Exact Match' : 'Cell Accuracy Evaluated') : 'Unverified (No Ground Truth)'}
          </span>
        </div>

        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-zinc-500">Speed Winner</span>
          <span className="text-sm font-bold text-indigo-300 mt-1">{speedWinner}</span>
          <span className="text-[10px] text-zinc-400 mt-1">
            A: {baseline.metrics.latencyMs}ms vs B: {hrm.metrics.latencyMs}ms
          </span>
        </div>

        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-zinc-500">Token Efficiency</span>
          <span className="text-sm font-bold text-amber-300 mt-1">{tokenWinner}</span>
          <span className="text-[10px] text-zinc-400 mt-1">
            A: {baseline.metrics.totalTokens}t vs B: {hrm.metrics.totalTokens}t
          </span>
        </div>

        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-zinc-500">Win Tally & Rounds</span>
          <span className="text-sm font-bold text-emerald-300 mt-1">A: {twinAWins} — B: {twinBWins}</span>
          <span className="text-[10px] text-zinc-400 mt-1">Total Rounds: {hrm.reasoningRounds}</span>
        </div>
      </div>
    </div>
  );
};
