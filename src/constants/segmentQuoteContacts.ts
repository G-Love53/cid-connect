/**
 * Canonical quote intake addresses per segment (shown on Quote tab).
 * Keep domains/spelling aligned with your live mailboxes.
 */
export interface SegmentQuoteContact {
  id: string;
  name: string;
  quoteEmail: string;
  icon: string;
}

export const SEGMENT_QUOTE_CONTACTS: SegmentQuoteContact[] = [
  { id: 'bar', name: 'Bar Insurance Direct', quoteEmail: 'quote@barinsurancedirect.com', icon: 'wine' },
  { id: 'plumber', name: 'Plumber Insurance Direct', quoteEmail: 'quotes@plumberinsurancedirect.com', icon: 'wrench' },
  { id: 'roofer', name: 'Roofer Insurance Direct', quoteEmail: 'quotes@rooferinsurancedirect.com', icon: 'home' },
];
