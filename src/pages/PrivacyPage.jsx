import PageFooter from './PageFooter';
import './PlaceholderPage.css';

// FILLER PAGE — replace the text below with the real content. It's plain
// HTML-style markup: <h1> is the big title, <p> is a paragraph.
export default function PrivacyPage() {
  return (
    <div className="placeholder-page">
      <p className="eyebrow">Legal</p>
      <h1 className="page-headline">Privacy</h1>
      <p className="placeholder-page__body">Placeholder — privacy policy will go here.</p>

      <PageFooter />
    </div>
  );
}
