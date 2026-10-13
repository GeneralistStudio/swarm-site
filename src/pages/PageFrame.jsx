import './Page.css';

// Wraps every page (Product, Education, Company, Terms, Privacy): the full-
// screen beige background, the centered content column, and the scrolling.
// The page scrolls *inside* this frame — the browser window itself never
// scrolls. Look & spacing: Page.css.
export default function PageFrame({ children }) {
  return (
    <main className="page">
      <div className="page__inner">{children}</div>
    </main>
  );
}
