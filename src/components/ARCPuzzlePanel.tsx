import React, { useState } from 'react';
import { ARCPuzzle, ARCGrid } from '../types/arc';
import { BUNDLED_ARC_PUZZLES } from '../engine/arcDataset';
import { ARCGridView } from './ARCGridView';

interface ARCPuzzlePanelProps {
  selectedPuzzle: ARCPuzzle;
  onSelectPuzzle: (puzzle: ARCPuzzle) => void;
  revealExpected: boolean;
  onToggleReveal: (reveal: boolean) => void;
  maxRounds: number;
  setMaxRounds: (rounds: number) => void;
}

export const ARCPuzzlePanel: React.FC<ARCPuzzlePanelProps> = ({
  selectedPuzzle,
  onSelectPuzzle,
  revealExpected,
  onToggleReveal,
  maxRounds,
  setMaxRounds
}) => {
  const [customJsonInput, setCustomJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const newPuzzle: ARCPuzzle = {
          id: `uploaded-${Date.now()}`,
          name: file.name.replace('.json', ''),
          description: 'Uploaded ARC JSON task file',
          training: parsed.train || parsed.training || [],
          test: parsed.test || [],
          source: 'uploaded'
        };
        onSelectPuzzle(newPuzzle);
        setJsonError(null);
      } catch (err: any) {
        setJsonError(`Invalid JSON format: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCustomJsonSubmit = () => {
    try {
      const parsed = JSON.parse(customJsonInput);
      const newPuzzle: ARCPuzzle = {
        id: `custom-${Date.now()}`,
        name: 'Custom ARC Task',
        description: 'User-provided JSON puzzle',
        training: parsed.train || parsed.training || [],
        test: parsed.test || [],
        source: 'custom'
      };
      onSelectPuzzle(newPuzzle);
      setJsonError(null);
      setCustomJsonInput('');
    } catch (err: any) {
      setJsonError(`Invalid JSON: ${err.message}`);
    }
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            ARC Puzzle Selector & Inspector
          </h2>
          <p className="text-xs text-zinc-400">
            Select a benchmark puzzle, upload ARC task JSON, or test custom transformations.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-zinc-800/80 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-medium text-zinc-300">
            <span>HRM Rounds (1-40):</span>
            <input
              type="number"
              min={1}
              max={40}
              value={maxRounds}
              onChange={(e) => setMaxRounds(Math.max(1, Math.min(40, parseInt(e.target.value) || 40)))}
              className="w-14 bg-zinc-900 border border-zinc-700 text-cyan-400 font-mono text-center rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 bg-zinc-800/80 px-3 py-1.5 rounded-lg border border-zinc-700 cursor-pointer hover:bg-zinc-700 transition">
            <input
              type="checkbox"
              checked={revealExpected}
              onChange={(e) => onToggleReveal(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
            />
            Reveal Expected Ground Truth
          </label>
        </div>
      </div>

      {/* Selector pills */}
      <div className="flex flex-wrap gap-2">
        {BUNDLED_ARC_PUZZLES.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPuzzle(p)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-2 border ${
              selectedPuzzle.id === p.id
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-zinc-950/60 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Selected Puzzle Details & Grids */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">{selectedPuzzle.name}</h3>
            <p className="text-xs text-zinc-400">{selectedPuzzle.description}</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
            {selectedPuzzle.source || 'bundled'}
          </span>
        </div>

        {/* Training Examples Grid Display */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Training Pairs ({selectedPuzzle.training.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPuzzle.training.map((ex, idx) => (
              <div key={idx} className="bg-zinc-900/70 border border-zinc-800/80 p-3 rounded-lg flex items-center justify-around gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono text-zinc-500 mb-1">Train {idx + 1} Input</span>
                  <ARCGridView grid={ex.input} size="sm" />
                </div>
                <div className="text-zinc-600 font-bold text-lg">→</div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono text-zinc-500 mb-1">Train {idx + 1} Output</span>
                  <ARCGridView grid={ex.output} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Input & Expected Display */}
        <div className="space-y-3 pt-2 border-t border-zinc-800/80">
          <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Test Evaluation Task</h4>
          <div className="flex flex-wrap gap-6 items-center justify-start">
            {selectedPuzzle.test.map((t, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-zinc-900/70 border border-zinc-800 p-3 rounded-lg">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono text-cyan-400 mb-1">Test Input</span>
                  <ARCGridView grid={t.input} size="md" />
                </div>
                {revealExpected && t.expectedOutput && (
                  <>
                    <div className="text-zinc-600 font-bold text-lg">⇒</div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-mono text-emerald-400 mb-1">Expected Output</span>
                      <ARCGridView grid={t.expectedOutput} size="md" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* JSON Upload / Paste Option */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3.5 py-2 rounded-xl cursor-pointer transition flex items-center gap-2">
            <span>Upload ARC Task JSON</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
          {jsonError && <span className="text-xs text-red-400">{jsonError}</span>}
        </div>
      </div>
    </div>
  );
};
