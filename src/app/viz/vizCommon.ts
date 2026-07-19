export const VIEWBOX = 1000;
export const CENTER = 500;

/** Format a viewBox-space coordinate as a CSS px value for `transform`. Inside an SVG subtree, CSS px in a transform resolves against the element's user-coordinate space (the viewBox), not physical screen pixels — verified against Chromium. */
export function px(value: number): string {
  return `${value}px`;
}
