import type { UnknownRegistryItem } from '../../types/forensic';

interface Props {
  unknowns: UnknownRegistryItem[];
}

export function UnknownRegistry({ unknowns }: Props) {
  return (
    <section className="space-y-2">
      <h3 className="font-bold">Unknown Variable Registry</h3>
      <div className="space-y-2">
        {unknowns.map((item) => (
          <article key={item.id} className="border border-slate-300 bg-white rounded-lg p-2 text-sm">
            <div className="font-semibold">{item.title}</div>
            <div>{item.detail}</div>
            <div className="text-xs">Impact: {item.impact}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
