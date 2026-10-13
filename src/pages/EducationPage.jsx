import { Suspense, useState } from 'react';
import { Globe3D } from '../components/globe/lazyGlobe';
import TimelineScrubber from '../components/globe/TimelineScrubber';
import { TIMELINE } from '../data/diseaseHotspots';
import { getGlobalStats } from '../data/placeholderLocationData';
import PageFooter from './PageFooter';
import './EducationPage.css';

const STAT_CARDS = [
  { label: 'Mosquito-borne diseases kill', key: 'bugDiseaseDeaths', suffix: '+' },
  { label: 'People infected with malaria', key: 'malariaCases', suffix: '+' },
  { label: 'Reported dengue fever cases', key: 'dengueCases', suffix: '+' },
];

const RESOURCE_CARDS = [0, 1, 2];

export default function EducationPage() {
  const [year, setYear] = useState(TIMELINE.today);
  // the timeline stays still until you drag it or press ▶ (it plays by itself on
  // the intro screen, but here the figures beside it would be counting up)
  const [playing, setPlaying] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  const stats = getGlobalStats(year);
  const card = STAT_CARDS[cardIndex];
  const cardValue = stats[card.key];

  return (
    <div className="education-page">
      <p className="eyebrow">Education</p>
      <h1 className="page-headline">It's harder than ever to access nature.</h1>

      <div className="education-page__map-row">
        <div className="education-page__data-card">
          <div className="legend">
            <span className="legend__dot" />
            Insect-borne diseases
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

        <div className="education-page__globe">
          <Suspense fallback={null}>
            <Globe3D interactive={false} autoRotate year={year} />
          </Suspense>
        </div>
      </div>

      <div className="education-page__stat-carousel">
        <button type="button" onClick={() => setCardIndex((i) => (i - 1 + STAT_CARDS.length) % STAT_CARDS.length)} aria-label="Previous stat">
          ‹
        </button>
        <div className="education-page__stat-carousel-body">
          <p className="education-page__stat-label">{card.label}</p>
          <p className="education-page__stat-value">
            {formatCompact(cardValue)}
            {card.suffix}
          </p>
        </div>
        <button type="button" onClick={() => setCardIndex((i) => (i + 1) % STAT_CARDS.length)} aria-label="Next stat">
          ›
        </button>
      </div>

      <div className="education-page__stat-dots">
        {STAT_CARDS.map((c, i) => (
          <button
            key={c.key}
            type="button"
            className={i === cardIndex ? 'education-page__stat-dot education-page__stat-dot--active' : 'education-page__stat-dot'}
            onClick={() => setCardIndex(i)}
            aria-label={`Show stat ${i + 1}`}
          />
        ))}
      </div>

      <p className="education-page__pitch">Bug repellent is by far the most effective way to protect yourself.</p>

      <div className="education-page__read-more">
        <button type="button" className="page-button">
          Read more
        </button>
      </div>

      <hr className="education-page__divider" />

      <p className="eyebrow">More resources</p>

      <div className="resource-grid">
        {RESOURCE_CARDS.map((i) => (
          <div key={i} className={i === 1 ? 'resource-card resource-card--active' : 'resource-card'} />
        ))}
      </div>

      <PageFooter />
    </div>
  );
}

function formatCompact(n) {
  return n.toLocaleString('en-US');
}
