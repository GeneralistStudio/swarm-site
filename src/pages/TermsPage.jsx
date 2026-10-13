import PageFooter from './PageFooter';
import './PlaceholderPage.css';

// FILLER PAGE — replace the text below with the real content. It's plain
// HTML-style markup: <h1> is the big title, <p> is a paragraph.
export default function TermsPage() {
  return (
    <div className="placeholder-page">
      <p className="eyebrow">Legal</p>
      <h1 className="page-headline">Terms</h1>
      <p className="placeholder-page__body">Placeholder — terms of service will go here.</p>

      <PageFooter />
    </div>
  );
}
