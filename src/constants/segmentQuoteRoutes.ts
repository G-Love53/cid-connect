/**
 * Canonical public quote intake URLs per segment (same forms used on segment sites).
 * Update these to match your live Netlify / marketing domains.
 */
export interface SegmentQuoteRoute {
  id: string;
  name: string;
  /** Full https URL to the segment quote page (opens in this tab). */
  quoteUrl: string;
  icon: string;
}

export const SEGMENT_QUOTE_ROUTES: SegmentQuoteRoute[] = [
  {
    id: 'bar',
    name: 'Bar Insurance Direct',
    quoteUrl: 'https://www.barinsurancedirect.com/',
    icon: 'wine',
  },
  {
    id: 'plumber',
    name: 'Plumber Insurance Direct',
    quoteUrl: 'https://www.plumberinsurancedirect.com/',
    icon: 'wrench',
  },
  {
    id: 'roofer',
    name: 'Roofer Insurance Direct',
    quoteUrl: 'https://www.rooferinsurancedirect.com/',
    icon: 'home',
  },
];
