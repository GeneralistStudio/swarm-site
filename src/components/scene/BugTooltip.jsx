import './BugTooltip.css';

// The info card that sits beside the cursor's swarm circle while the Data
// panel is open: which kinds of bugs are in the circle, what they're
// carrying, and how contagious it is. Content comes from `summary` (see
// summarizeBugs in src/data/diseaseData.js).
//
// Position and show/hide are driven by SwarmCanvas every frame (it sets the
// data-visible / data-side attributes and moves the card) — so there's no
// positioning in this file. All of the looks are in BugTooltip.css.
export default function BugTooltip({ summary, ref }) {
  return (
    <div className="bug-tooltip" ref={ref} aria-hidden="true">
      {summary && (
        <div className="bug-tooltip__card">
          <ul className="bug-tooltip__types">
            {summary.types.map((type) => (
              <li key={type} className="bug-tooltip__chip">
                {type}
              </li>
            ))}
          </ul>

          <p className="bug-tooltip__label">Carrying</p>
          <p className="bug-tooltip__value">{summary.diseases.length ? summary.diseases.join(', ') : 'None'}</p>

          <p className="bug-tooltip__label">Contagious</p>
          <p className="bug-tooltip__value" data-level={summary.level}>
            {summary.level}
          </p>
        </div>
      )}
    </div>
  );
}
