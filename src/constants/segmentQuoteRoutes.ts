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
    name: 'Roofing Contractor Insurance Direct',
    quoteUrl: 'https://roofingcontractorinsurancedirect.com/',
    icon: 'home',
  },
  {
    id: 'hvac',
    name: 'HVAC Insurance Direct',
    quoteUrl: 'https://hvacinsurancedirect.com/',
    icon: 'home',
  },
  {
    id: 'fitness',
    name: 'Fitness Insurance Direct',
    quoteUrl: 'https://www.fitnessinsurancedirect.com/',
    icon: 'home',
  },
];

/** Intake URL for a quote segment id (falls back to bar). */
export function quoteIntakeUrlForSegment(segment: string | null | undefined): string {
  const id = String(segment ?? 'bar').toLowerCase();
  const match = SEGMENT_QUOTE_ROUTES.find((s) => s.id === id);
  return match?.quoteUrl ?? SEGMENT_QUOTE_ROUTES[0].quoteUrl;
}
