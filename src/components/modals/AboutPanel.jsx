import productKinfield from '../../assets/product-kindred.png';
import productBuzzie from '../../assets/product-buzzie.png';
import productOff from '../../assets/product-off.png';
import productSckfree from '../../assets/product-sckfree.png';
import productSawyer from '../../assets/product-sawyer.png';
import productOffBotanicals from '../../assets/product-off-botanicals.png';
import PanelFooter from './PanelFooter';
import './AboutPanel.css';

const COMPETITOR_PRODUCTS = [
  { name: 'Kinfield', image: productKinfield },
  { name: 'Buzzie', image: productBuzzie },
  { name: 'OFF! Deep Woods', image: productOff },
  { name: 'Skrfree', image: productSckfree },
  { name: 'Sawyer Family', image: productSawyer },
  { name: 'OFF! Botanicals', image: productOffBotanicals },
];

const FEATURE_PILLS = ['14 Hours of Protection', 'Deet-Free', 'Fresh Citrus Scent', 'Moisturizing Lotion'];

export default function AboutPanel() {
  return (
    <div className="about-panel">
      <p className="eyebrow">About Swarm</p>
      <h2 className="panel-headline">60% of people don't use bug repellent.¹</h2>

      <div className="product-row">
        {COMPETITOR_PRODUCTS.map(({ name, image }) => (
          <div className="product-row__slot" key={name}>
            <img className="product-row__photo" src={image} alt={name} />
          </div>
        ))}
      </div>

      <p className="about-panel__lede">And no wonder—it's gross, ugly, and smelly.²</p>

      <div className="about-panel__feature">
        <p className="about-panel__body">
          That's why we developed Swarm® a bug repellent that protects you—and actually feels good.
        </p>

        <div className="about-panel__package">
          <p className="about-panel__package-name">
            Swarm<sup>®</sup>
          </p>
          <p className="about-panel__package-tag">[package]</p>
        </div>

        <div className="pill-row">
          {FEATURE_PILLS.map((pill) => (
            <span className="pill" key={pill}>
              {pill}
            </span>
          ))}
        </div>
      </div>

      <p className="about-panel__footnotes">1. Placeholder citation. 2. Placeholder citation.</p>

      <PanelFooter />
    </div>
  );
}
