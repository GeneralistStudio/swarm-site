import productKinfield from '../assets/product-kindred.png';
import productBuzzie from '../assets/product-buzzie.png';
import productOff from '../assets/product-off.png';
import productSckfree from '../assets/product-sckfree.png';
import productSawyer from '../assets/product-sawyer.png';
import productOffBotanicals from '../assets/product-off-botanicals.png';
import PageFooter from './PageFooter';
import './ProductPage.css';

const COMPETITOR_PRODUCTS = [
  { name: 'Kinfield', image: productKinfield },
  { name: 'Buzzie', image: productBuzzie },
  { name: 'OFF! Deep Woods', image: productOff },
  { name: 'Skrfree', image: productSckfree },
  { name: 'Sawyer Family', image: productSawyer },
  { name: 'OFF! Botanicals', image: productOffBotanicals },
];

const FEATURE_PILLS = ['14 Hours of Protection', 'Deet-Free', 'Fresh Citrus Scent', 'Moisturizing Lotion'];

export default function ProductPage() {
  return (
    <div className="product-page">
      <p className="eyebrow">Product</p>
      <h1 className="page-headline">60% of people don't use bug repellent.¹</h1>

      <div className="product-row">
        {COMPETITOR_PRODUCTS.map(({ name, image }) => (
          <div className="product-row__slot" key={name}>
            <img className="product-row__photo" src={image} alt={name} />
          </div>
        ))}
      </div>

      <p className="product-page__lede">And no wonder—it's gross, ugly, and smelly.²</p>

      <div className="product-page__feature">
        <p className="product-page__body">
          That's why we developed Swarm® a bug repellent that protects you—and actually feels good.
        </p>

        <div className="product-page__package">
          <p className="product-page__package-name">
            Swarm<sup>®</sup>
          </p>
          <p className="product-page__package-tag">[package]</p>
        </div>

        <div className="pill-row">
          {FEATURE_PILLS.map((pill) => (
            <span className="pill" key={pill}>
              {pill}
            </span>
          ))}
        </div>
      </div>

      <p className="product-page__footnotes">1. Placeholder citation. 2. Placeholder citation.</p>

      <PageFooter />
    </div>
  );
}
