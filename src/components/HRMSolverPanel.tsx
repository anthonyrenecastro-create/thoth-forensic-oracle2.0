import React from 'react';
import { HRMSolverResponse } from '../types/arc';
import { ARCGridView } from './ARCGridView';

interface HRMSolverPanelProps {
  result: HRMSolverResponse | null;
  isRunning: boolean;
}

export const HRMSolverPanel: React.FC<HRMSolverPanelProps> = ({ result, isRunning }) => {
  return (
    <div className="bg-zinc-900/90 border border-cyan-500/30 rounded-2xl p-5 shadow-xl shadow-cyan-500/5 flex flex-col justify-between space-y-4 h-full">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Twin B — HRM Augmented
          </span>
          <h3 className="text-base font-bold text-zinc-100 mt-1">Gemini + HRM Solver</h3>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              Reasoning Rounds...
            </span>
          ) : result ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Committed
            </span>
          ) : (
            <span className="text-xs text-zinc-500 font-medium">Ready</span>
          )}
        </div>
      </div>

      {isRunning ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 flex-1">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400 font-mono">HRM substrate decomposing observations & arbitrating...</p>
        </div>
      ) : result ? (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex flex-col items-center">
              <span className="text-xs font-medium text-zinc-400 mb-2">Predicted Test Grid</span>
              <ARCGridView grid={result.predictedOutput} size="lg" />
            </div>

            <div className="space-y-2 bg-zinc-950/50 p-3 rounded-xl border border-cyan-500/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-cyan-300">
                    Rule Summary {result.committedHypothesis ? `(${result.committedHypothesis.name})` : ''}
                  </span>
                  <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                    Role: 40-Round HRM Refinement
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
                  Confidence: {Math.round((result.committedHypothesis?.confidence || 0.95) * 100)}%
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {result.committedHypothesis?.description || 'HRM multi-round verified transformation rule.'}
              </p>
              {result.committedHypothesis?.ruleSteps && result.committedHypothesis.ruleSteps.length > 0 && (
                <ul className="text-xs text-zinc-400 space-y-1 pl-4 list-disc font-mono pt-1">
                  {result.committedHypothesis.ruleSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Hypotheses Ledger ({result.hypothesesLedger.length})</span>
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {result.hypothesesLedger.map((hyp, idx) => (
                  <div key={idx} className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800 text-xs flex justify-between items-center">
                    <span className="font-mono text-zinc-300 truncate max-w-[200px]">{hyp.name}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">exact: {hyp.trainingExactMatches}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800 text-center mt-auto">
            <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">Latency / Rounds</span>
              <span className="text-xs font-mono font-semibold text-zinc-200">{result.metrics.latencyMs || 0}ms ({result.reasoningRounds}r)</span>
            </div>
            <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">API Calls</span>
              <span className="text-xs font-mono font-semibold text-zinc-200">{result.metrics.apiCalls}</span>
            </div>
            <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800" title={`In: ${result.metrics.inputTokens}, Out: ${result.metrics.outputTokens}`}>
              <span className="text-[10px] text-zinc-500 block">Tokens (In/Out)</span>
              <span className="text-xs font-mono font-semibold text-zinc-200">{result.metrics.totalTokens} ({result.metrics.inputTokens}/{result.metrics.outputTokens})</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center text-zinc-500 space-y-2 flex-1">
          <p className="text-xs">Run the benchmark to generate Twin B HRM augmented predictions.</p>
        </div>
      )}
    </div>
  );
};

