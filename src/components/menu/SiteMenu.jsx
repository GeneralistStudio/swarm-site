import { useEffect, useState } from 'react';
import Wordmark from '../brand/Wordmark';
import { MENU_LINKS, LEGAL_LINKS } from '../../siteConfig';
import './SiteMenu.css';

// The hamburger menu, top center. One rounded card: the bar (logo + button)
// is always visible, and the link list expands out of the bottom of it.
// All the visuals + animation are in SiteMenu.css — links come from
// src/siteConfig.js.
export default function SiteMenu({ currentPath }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Escape closes it
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-menu" data-open={open} data-swarm-ignore>
      {/* progressive blur: the page behind is blurriest at the top and
          sharpens toward the bottom. Six stacked layers, each blurring a
          little more than the last (see SiteMenu.css). Only shows when open. */}
      <div className="site-menu__blur" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* invisible click-catcher behind the card: clicking anywhere else
          closes the menu. (Make it visible via --menu-scrim in the CSS.) */}
      <div className="site-menu__scrim" onClick={close} />

      <div className="site-menu__card">
        <div className="site-menu__bar">
          <a className="site-menu__logo" href="#/" onClick={close} aria-label="Swarm — home">
            <Wordmark />
          </a>

          <button
            type="button"
            className="site-menu__toggle"
            aria-expanded={open}
            aria-controls="site-menu-drawer"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {/* three lines that morph into an X when open (see CSS) */}
            <span className="site-menu__icon" aria-hidden="true">
              <span className="site-menu__line" />
              <span className="site-menu__line" />
              <span className="site-menu__line" />
            </span>
          </button>
        </div>

        <div className="site-menu__drawer" id="site-menu-drawer">
          <div className="site-menu__clip">
            <div className="site-menu__content">
              <nav aria-label="Main">
                <ul className="site-menu__links">
                  {MENU_LINKS.map((link, i) => (
                    <li key={link.path} style={{ '--i': i }}>
                      <a
                        href={`#${link.path}`}
                        aria-current={link.path === currentPath ? 'page' : undefined}
                        onClick={close}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <ul className="site-menu__legal" style={{ '--i': MENU_LINKS.length }}>
                {LEGAL_LINKS.map((link) => (
                  <li key={link.path}>
                    <a
                      href={`#${link.path}`}
                      aria-current={link.path === currentPath ? 'page' : undefined}
                      onClick={close}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
