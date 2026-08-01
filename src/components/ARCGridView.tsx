import React from 'react';
import { ARCGrid } from '../types/arc';

export const ARC_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-zinc-900', text: 'text-zinc-500', border: 'border-zinc-800' },
  1: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500' },
  2: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-500' },
  3: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-500' },
  4: { bg: 'bg-amber-400', text: 'text-black', border: 'border-amber-300' },
  5: { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-400' },
  6: { bg: 'bg-fuchsia-600', text: 'text-white', border: 'border-fuchsia-500' },
  7: { bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-500' },
  8: { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-500' },
  9: { bg: 'bg-rose-950', text: 'text-rose-200', border: 'border-rose-800' },
};

interface ARCGridViewProps {
  grid: ARCGrid;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onCellClick?: (row: number, col: number) => void;
  highlightDiff?: ARCGrid;
}

export const ARCGridView: React.FC<ARCGridViewProps> = ({
  grid,
  size = 'md',
  interactive = false,
  onCellClick,
  highlightDiff
}) => {
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    return <div className="text-xs text-zinc-500 italic p-2">Empty grid</div>;
  }

  const cellSize = size === 'sm' ? 'w-5 h-5 text-[10px]' : size === 'lg' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs';

  return (
    <div className="inline-block p-2 bg-zinc-950/80 rounded-lg border border-zinc-800 shadow-inner">
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${grid[0]?.length || 1}, minmax(0, 1fr))`
        }}
      >
        {grid.map((row, rIdx) =>
          row.map((cellVal, cIdx) => {
            const colorCfg = ARC_COLORS[cellVal] || ARC_COLORS[0];
            const isDiffMismatch =
              highlightDiff &&
              (highlightDiff[rIdx]?.[cIdx] !== cellVal);

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                onClick={() => interactive && onCellClick && onCellClick(rIdx, cIdx)}
                className={`
                  ${cellSize} flex items-center justify-center font-mono font-bold rounded-[2px] transition-all
                  ${colorCfg.bg} ${colorCfg.text} border ${colorCfg.border}
                  ${interactive ? 'cursor-pointer hover:opacity-80 hover:scale-105' : ''}
                  ${isDiffMismatch ? 'ring-2 ring-red-500 animate-pulse' : ''}
                `}
                title={`r${rIdx} c${cIdx}: val ${cellVal}`}
              >
                {size === 'lg' ? cellVal : ''}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
