import PageFooter from './PageFooter';
import './PlaceholderPage.css';

// FILLER PAGE — replace the text below with the real content. It's plain
// HTML-style markup: <h1> is the big title, <p> is a paragraph.
export default function CompanyPage() {
  return (
    <div className="placeholder-page">
      <p className="eyebrow">Company</p>
      <h1 className="page-headline">Company</h1>
      <p className="placeholder-page__body">Placeholder — company story, team and contact will go here.</p>

      <PageFooter />
    </div>
  );
}
