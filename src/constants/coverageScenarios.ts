export type CoverageScenario = {
  id: string;
  label: string;
  prompt: string;
};

const DEFAULT_SCENARIOS: CoverageScenario[] = [
  { id: 'water', label: 'Water Damage', prompt: 'Am I covered for water damage at my business location?' },
  { id: 'fire', label: 'Fire', prompt: 'Am I covered if a fire damages my property or operations?' },
  { id: 'slip', label: 'Slip & Fall', prompt: 'Am I covered if a customer slips and falls on my premises?' },
  { id: 'theft', label: 'Theft', prompt: 'Am I covered for theft of business property or equipment?' },
  { id: 'vehicle', label: 'Vehicle Accident', prompt: 'Am I covered for a vehicle accident involving my business?' },
  { id: 'employee', label: 'Employee Injury', prompt: 'Am I covered if an employee is injured on the job?' },
  { id: 'lawsuit', label: 'Lawsuit', prompt: 'Am I covered if someone sues my business for bodily injury or property damage?' },
  { id: 'equipment', label: 'Equipment Breakdown', prompt: 'Am I covered if critical equipment breaks down and interrupts operations?' },
];

const BAR_SCENARIOS: CoverageScenario[] = [
  { id: 'liquor', label: 'Liquor Liability', prompt: 'Am I covered for a liquor liability incident at my bar or restaurant?' },
  { id: 'assault', label: 'Assault / Altercation', prompt: 'Am I covered if a fight or assault occurs on my premises?' },
  { id: 'food', label: 'Foodborne Illness', prompt: 'Am I covered if a customer claims food poisoning or foodborne illness?' },
  { id: 'delivery', label: 'Delivery Accident', prompt: 'Am I covered if my delivery driver causes an accident?' },
  { id: 'entertainment', label: 'Live Entertainment', prompt: 'Am I covered for live entertainment or events at my location?' },
  { id: 'cooking', label: 'Kitchen / Grease Fire', prompt: 'Am I covered for a grease fire or kitchen equipment fire?' },
  { id: 'slip', label: 'Slip & Fall', prompt: 'Am I covered if a patron slips and falls in my restaurant or bar?' },
  { id: 'employee', label: 'Employee Injury', prompt: 'Am I covered if a bartender or kitchen employee is injured at work?' },
];

const ROOFER_SCENARIOS: CoverageScenario[] = [
  { id: 'fall', label: 'Worker Fall', prompt: 'Am I covered if a roofer falls from a ladder or roof?' },
  { id: 'heat', label: 'Heat / Torch Work', prompt: 'Am I covered for damage caused during torch-down or heat application?' },
  { id: 'wind', label: 'Wind / Storm Damage', prompt: 'Am I covered if completed roofing work fails during a wind or hail event?' },
  { id: 'property', label: 'Customer Property Damage', prompt: 'Am I covered if we accidentally damage a customer\'s property while roofing?' },
  { id: 'sub', label: 'Subcontractor Issue', prompt: 'Am I covered if a subcontractor causes damage or injury on my job?' },
  { id: 'leak', label: 'Roof Leak After Job', prompt: 'Am I covered if a roof we installed leaks and causes interior water damage?' },
  { id: 'vehicle', label: 'Vehicle / Equipment', prompt: 'Am I covered if our work truck or equipment causes an accident?' },
  { id: 'lawsuit', label: 'Lawsuit / Claim', prompt: 'Am I covered if a property owner sues over our roofing work?' },
];

const PLUMBER_SCENARIOS: CoverageScenario[] = [
  { id: 'water', label: 'Water Damage', prompt: 'Am I covered if a plumbing job causes water damage to a building?' },
  { id: 'gas', label: 'Gas Line Work', prompt: 'Am I covered for incidents related to gas line installation or repair?' },
  { id: 'mold', label: 'Mold / Moisture', prompt: 'Am I covered if a customer claims mold or moisture damage from our work?' },
  { id: 'sub', label: 'Subcontractor', prompt: 'Am I covered if a subcontractor causes damage on my plumbing job?' },
  { id: 'property', label: 'Property Damage', prompt: 'Am I covered if we damage a customer\'s property while working?' },
  { id: 'employee', label: 'Employee Injury', prompt: 'Am I covered if a plumber or apprentice is injured on a job site?' },
  { id: 'boiler', label: 'Boiler / Steam', prompt: 'Am I covered for boiler, steam, or high-pressure work incidents?' },
  { id: 'lawsuit', label: 'Lawsuit', prompt: 'Am I covered if a homeowner or GC sues over our plumbing work?' },
];

const HVAC_SCENARIOS: CoverageScenario[] = [
  { id: 'refrigerant', label: 'Refrigerant Leak', prompt: 'Am I covered for a refrigerant leak or environmental exposure claim?' },
  { id: 'fire', label: 'Fire / Electrical', prompt: 'Am I covered if HVAC electrical work causes a fire?' },
  { id: 'property', label: 'Property Damage', prompt: 'Am I covered if we damage a customer\'s property during HVAC service?' },
  { id: 'employee', label: 'Employee Injury', prompt: 'Am I covered if a technician is injured on a job site?' },
  { id: 'equipment', label: 'Equipment Failure', prompt: 'Am I covered if installed equipment fails and causes damage?' },
  { id: 'carbon', label: 'Carbon Monoxide', prompt: 'Am I covered for carbon monoxide or ventilation-related claims?' },
  { id: 'sub', label: 'Subcontractor', prompt: 'Am I covered if a subcontractor causes damage on my HVAC project?' },
  { id: 'lawsuit', label: 'Lawsuit', prompt: 'Am I covered if a customer sues over our HVAC installation or repair?' },
];

const FITNESS_SCENARIOS: CoverageScenario[] = [
  { id: 'injury', label: 'Member Injury', prompt: 'Am I covered if a gym member is injured using equipment?' },
  { id: 'slip', label: 'Slip & Fall', prompt: 'Am I covered if someone slips and falls in my fitness facility?' },
  { id: 'trainer', label: 'Trainer Liability', prompt: 'Am I covered if a personal trainer is accused of negligence?' },
  { id: 'equipment', label: 'Equipment Injury', prompt: 'Am I covered for injuries related to fitness equipment?' },
  { id: 'employee', label: 'Staff Injury', prompt: 'Am I covered if an employee is injured at the gym?' },
  { id: 'property', label: 'Property Damage', prompt: 'Am I covered for damage to our facility or tenant property?' },
  { id: 'lawsuit', label: 'Lawsuit', prompt: 'Am I covered if a member sues my fitness business?' },
  { id: 'water', label: 'Water / Facility Damage', prompt: 'Am I covered for water damage or facility-related losses?' },
];

const BY_SEGMENT: Record<string, CoverageScenario[]> = {
  bar: BAR_SCENARIOS,
  roofer: ROOFER_SCENARIOS,
  roofing: ROOFER_SCENARIOS,
  plumber: PLUMBER_SCENARIOS,
  hvac: HVAC_SCENARIOS,
  fitness: FITNESS_SCENARIOS,
};

export function normalizeSegment(segment?: string | null): string {
  return String(segment || '')
    .trim()
    .toLowerCase()
    .replace(/^roofing$/, 'roofer');
}

export function getCoverageScenariosForSegment(segment?: string | null): CoverageScenario[] {
  const key = normalizeSegment(segment);
  return BY_SEGMENT[key] || DEFAULT_SCENARIOS;
}

export function getSegmentDisplayName(segment?: string | null): string {
  const key = normalizeSegment(segment);
  const labels: Record<string, string> = {
    bar: 'Bar & Restaurant',
    roofer: 'Roofing',
    plumber: 'Plumbing',
    hvac: 'HVAC',
    fitness: 'Fitness',
  };
  return labels[key] || 'Commercial';
}
