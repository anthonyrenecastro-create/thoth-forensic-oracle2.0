import React from 'react';
import { ARCBenchmarkRecord } from '../types/arc';

interface BenchmarkHistoryProps {
  records: ARCBenchmarkRecord[];
  onClearHistory: () => void;
}

export const BenchmarkHistory: React.FC<BenchmarkHistoryProps> = ({ records, onClearHistory }) => {
  const exportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `thoth_arc_benchmark_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-zinc-100">Benchmark Run History ({records.length})</h3>
        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <>
              <button
                onClick={exportJson}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-cyan-300 px-3 py-1.5 rounded-lg border border-zinc-700 transition font-mono"
              >
                Export JSON
              </button>
              <button
                onClick={onClearHistory}
                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/30 transition font-mono"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <p className="text-xs text-zinc-500 italic py-4 text-center">No benchmark records in session history.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {records.map((rec) => (
            <div key={rec.runId} className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-cyan-400 font-bold">{rec.puzzleId}</span>
                <span className="text-zinc-500 ml-2">{new Date(rec.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-zinc-300">Model: {rec.model}</span>
                <span className="text-emerald-400 font-semibold">Winner: {rec.winner.overall}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
