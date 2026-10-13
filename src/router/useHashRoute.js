import { useEffect, useState } from 'react';

// Tiny router: the "page" is whatever comes after the # in the address bar
// (e.g. https://…/#/product). Hash links work on GitHub Pages with no
// server setup, the browser Back button works, and every page is
// linkable — links are just <a href="#/product"> in the markup.
function readPath() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw.startsWith('/')) return '/';
  return raw.length > 1 ? raw.replace(/\/+$/, '') : '/';
}

export function useHashRoute() {
  const [path, setPath] = useState(readPath);

  useEffect(() => {
    const onChange = () => setPath(readPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return path;
}
