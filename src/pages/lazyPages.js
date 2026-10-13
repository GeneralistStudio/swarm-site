import { lazy } from 'react';

// Which page each address shows, each loaded on demand — a visitor on Home
// shouldn't have to download the Product / Education / Company / Terms /
// Privacy pages up front. (Home ("/") isn't listed: Home is the intro + swarm
// game, handled in App.jsx. Menu labels/order live in src/siteConfig.js —
// point a path at a different page here.)
const loaders = {
  '/product': () => import('./ProductPage'),
  '/education': () => import('./EducationPage'),
  '/company': () => import('./CompanyPage'),
  '/terms': () => import('./TermsPage'),
  '/privacy': () => import('./PrivacyPage'),
};

export const PAGES = Object.fromEntries(Object.entries(loaders).map(([path, load]) => [path, lazy(load)]));

// Called once the home screen is up and the browser is idle: fetches every
// page in the background so a click in the menu opens instantly.
export function prefetchPages() {
  for (const load of Object.values(loaders)) load();
}
