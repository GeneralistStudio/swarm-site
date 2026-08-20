import { useState } from 'react';
import Globe3D from '../globe/Globe3D';
import TimelineScrubber from '../globe/TimelineScrubber';
import { getGlobalStats } from '../../data/placeholderLocationData';
import PanelFooter from './PanelFooter';
import './SwarmPanel.css';

const STAT_CARDS = [
  { label: 'Mosquito-borne diseases kill', key: 'bugDiseaseDeaths', suffix: '+' },
  { label: 'People infected with malaria', key: 'malariaCases', suffix: '+' },
  { label: 'Reported dengue fever cases', key: 'dengueCases', suffix: '+' },
];

const RESOURCE_CARDS = [0, 1, 2];

export default function SwarmPanel() {
  const [year, setYear] = useState(2025);
  const [playing, setPlaying] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);

  const stats = getGlobalStats(year);
  const card = STAT_CARDS[cardIndex];
  const cardValue = stats[card.key];

  return (
    <div className="swarm-panel">
      <p className="eyebrow">The problem</p>
      <h2 className="panel-headline">It's harder than ever to access nature.</h2>

      <div className="swarm-panel__map-row">
        <div className="swarm-panel__data-card">
          <div className="legend">
            <span className="legend__dot" />
            Mosquito territory
          </div>
          <TimelineScrubber year={year} onChange={setYear} playing={playing} onTogglePlay={() => setPlaying((p) => !p)} />
          <dl className="stat-list">
            <div>
              <dt>Malaria cases</dt>
              <dd>{formatCompact(stats.malariaCases)}</dd>
            </div>
            <div>
              <dt>Dengue fever cases</dt>
              <dd>{formatCompact(stats.dengueCases)}</dd>
            </div>
            <div>
              <dt>Bug disease deaths</dt>
              <dd>{formatCompact(stats.bugDiseaseDeaths)}</dd>
            </div>
          </dl>
        </div>

        <div className="swarm-panel__globe">
          <Globe3D interactive={false} autoRotate year={year} />
        </div>
      </div>

      <div className="swarm-panel__stat-carousel">
        <button type="button" onClick={() => setCardIndex((i) => (i - 1 + STAT_CARDS.length) % STAT_CARDS.length)} aria-label="Previous stat">
          ‹
        </button>
        <div className="swarm-panel__stat-carousel-body">
          <p className="swarm-panel__stat-label">{card.label}</p>
          <p className="swarm-panel__stat-value">
            {formatCompact(cardValue)}
            {card.suffix}
          </p>
        </div>
        <button type="button" onClick={() => setCardIndex((i) => (i + 1) % STAT_CARDS.length)} aria-label="Next stat">
          ›
        </button>
      </div>

      <div className="swarm-panel__stat-dots">
        {STAT_CARDS.map((c, i) => (
          <button
            key={c.key}
            type="button"
            className={i === cardIndex ? 'swarm-panel__stat-dot swarm-panel__stat-dot--active' : 'swarm-panel__stat-dot'}
            onClick={() => setCardIndex(i)}
            aria-label={`Show stat ${i + 1}`}
          />
        ))}
      </div>

      <p className="swarm-panel__pitch">Bug repellent is by far the most effective way to protect yourself.</p>

      <div className="swarm-panel__read-more">
        <button type="button" className="panel-button">
          Read more
        </button>
      </div>

      <hr className="swarm-panel__divider" />

      <p className="eyebrow">More resources</p>

      <div className="resource-grid">
        {RESOURCE_CARDS.map((i) => (
          <div key={i} className={i === 1 ? 'resource-card resource-card--active' : 'resource-card'} />
        ))}
      </div>

      <PanelFooter />
    </div>
  );
}

function formatCompact(n) {
  return n.toLocaleString('en-US');
}
