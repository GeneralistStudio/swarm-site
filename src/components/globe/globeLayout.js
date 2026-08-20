// Shared by PersistentGlobe (to size/position the actual globe) and
// IntroGlow (to center the glow behind it) — kept in one place so the two
// can never drift out of alignment.
export function getExpandedGlobeRect(width, height) {
  const size = Math.min(Math.min(width, height) * 0.88, 900);
  // pushed down so a larger share of the circle bleeds off the bottom edge —
  // tied to the viewport bottom (not just centered + offset), so it still
  // overhangs once size hits its 900px cap on larger screens
  const top = height - size * 0.88;
  const left = width / 2 - size / 2;
  return { top, left, size };
}
