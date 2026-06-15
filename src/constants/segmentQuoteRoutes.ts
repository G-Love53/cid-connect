/**
 * Canonical public quote intake URLs per segment (same forms used on segment sites).
 * ConnectQuote segments point at connectquote.html; bar/roofer stay traditional home.
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
    quoteUrl:
      'https://www.plumberinsurancedirect.com/connectquote.html?bc=plumbing_contractor',
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
    quoteUrl:
      'https://hvacinsurancedirect.com/connectquote.html?bc=hvac_contractor',
    icon: 'home',
  },
  {
    id: 'fitness',
    name: 'Fitness Insurance Direct',
    quoteUrl: 'https://www.fitnessinsurancedirect.com/connectquote.html',
    icon: 'home',
  },
  {
    id: 'electrical',
    name: 'Electrical Insurance Direct',
    quoteUrl: 'https://electricalinsurancedirect.com/connectquote.html',
    icon: 'zap',
  },
];

/** Fitness ConnectQuote deep links (business class pre-selected). */
export const FITNESS_CONNECTQUOTE_ROUTES = [
  {
    id: 'yoga_studio',
    name: 'Yoga studio',
    quoteUrl:
      'https://www.fitnessinsurancedirect.com/connectquote.html?bc=yoga_studio',
  },
  {
    id: 'pilates_studio',
    name: 'Pilates / mind-body',
    quoteUrl:
      'https://www.fitnessinsurancedirect.com/connectquote.html?bc=pilates_studio',
  },
  {
    id: 'personal_trainer',
    name: 'Personal trainer',
    quoteUrl:
      'https://www.fitnessinsurancedirect.com/connectquote.html?bc=personal_trainer',
  },
] as const;

/** Intake URL for a quote segment id (falls back to bar). */
export function quoteIntakeUrlForSegment(segment: string | null | undefined): string {
  const id = String(segment ?? 'bar').toLowerCase();
  const match = SEGMENT_QUOTE_ROUTES.find((s) => s.id === id);
  return match?.quoteUrl ?? SEGMENT_QUOTE_ROUTES[0].quoteUrl;
}
