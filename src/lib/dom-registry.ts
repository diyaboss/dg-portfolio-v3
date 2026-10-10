/**
 * DOM nodes that the WebGL scene positions every frame (callouts that track
 * 3D objects). Components register here via ref callbacks; scenes write
 * `style.transform` directly so React never re-renders per frame.
 */
export const domRegistry = {
  projectAnchors: [] as (HTMLElement | null)[],
  blockCallouts: [] as (HTMLElement | null)[],
  blockPath: null as SVGPolylineElement | null,
  /** Element focused before a project overlay opened, for focus restoration. */
  returnFocus: null as HTMLElement | null,
  /** Set by in-page project links so the overlay can close with history.back(). */
  openedFromHome: false,
};
