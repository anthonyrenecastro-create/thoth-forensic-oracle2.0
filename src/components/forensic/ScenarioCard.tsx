import type { ForensicScenario } from '../../types/forensic';

interface Props {
  scenario: ForensicScenario;
}

export function ScenarioCard({ scenario }: Props) {
  return (
    <article className="border border-slate-300 rounded-lg bg-white p-3 space-y-2">
      <h4 className="font-bold">{scenario.title}</h4>
      <div className="text-xs text-slate-600">Class: {scenario.scenarioClass}</div>
      <div className="text-xs">Analytical weight: {scenario.analyticalWeight.toFixed(3)} (comparative, not courtroom probability)</div>
      <div className="text-xs">Interval: [{scenario.weightInterval[0].toFixed(2)}, {scenario.weightInterval[1].toFixed(2)}]</div>
      <ul className="text-xs list-disc pl-4">
        {scenario.sequence.map((event) => (
          <li key={`${scenario.id}-${event.order}`}>
            {event.order}. {event.eventType} - {event.explanation}
          </li>
        ))}
      </ul>
    </article>
  );
}
