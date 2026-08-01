interface Props {
  layers: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export function MapLayerControls({ layers, onToggle }: Props) {
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-3 space-y-2 text-sm">
      <h3 className="font-bold">Layer Controls</h3>
      {Object.entries(layers).map(([key, value]) => (
        <label key={key} className="flex items-center gap-2">
          <input type="checkbox" checked={value} onChange={() => onToggle(key)} />
          <span>{key}</span>
        </label>
      ))}
    </div>
  );
}
