import React from 'react';
import { ARCGrid } from '../types/arc';
import { ARCGridView } from './ARCGridView';

interface GridDifferenceViewProps {
  predicted: ARCGrid;
  expected: ARCGrid;
}

export const GridDifferenceView: React.FC<GridDifferenceViewProps> = ({ predicted, expected }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-zinc-400 mb-1">Predicted Grid</span>
        <ARCGridView grid={predicted} size="md" />
      </div>
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-zinc-400 mb-1">Expected Ground Truth</span>
        <ARCGridView grid={expected} size="md" highlightDiff={predicted} />
      </div>
    </div>
  );
};
