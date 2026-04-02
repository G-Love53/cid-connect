export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

export interface Policy {
  id: string;
  user_id: string;
  policy_number: string;
  segment: string;
  business_name: string;
  carrier: string;
  carrier_id: string | null;
  effective_date: string;
  expiration_date: string;
  premium: number;
  status: string;
  general_liability_limit: string | null;
  property_limit: string | null;
  auto_limit: string | null;
  workers_comp_limit: string | null;
  umbrella_limit: string | null;
  deductible: number | null;
  payment_frequency: string | null;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  created_at: string;
  updated_at: string;
}


export interface COIRequest {
  id: string;
  user_id: string;
  policy_id: string | null;
  request_number: string;
  certificate_holder_name: string;
  certificate_holder_address: string | null;
  certificate_holder_city: string | null;
  certificate_holder_state: string | null;
  certificate_holder_zip: string | null;
  delivery_email: string;
  certificate_type: string;
  additional_instructions: string | null;
  uploaded_file_path: string | null;
  uploaded_file_name: string | null;
  status: 'submitted' | 'processing' | 'completed' | 'failed';
  pdf_url: string | null;
  generated_pdf_url: string | null;
  segment: string | null;
  backend_notified: boolean;
  backend_response: any | null;
  created_at: string;
  updated_at: string;
}



export interface Claim {
  id: string;
  user_id: string;
  policy_id: string;
  claim_number: string | null;
  segment: string | null;
  incident_date: string;
  incident_time: string | null;
  incident_location: string;
  description: string;
  claim_type: string | null;
  estimated_amount: number | null;
  settlement_amount: number | null;
  settlement_date: string | null;
  third_party_name: string | null;
  third_party_contact: string | null;
  third_party_insurance: string | null;
  photos: string[] | null;
  status: string;
  adjuster_name: string | null;
  adjuster_phone: string | null;
  notes: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  backend_notified: boolean;
  backend_response: any | null;
  created_at: string;
  updated_at: string;
}




export interface ChatMessage {
  id: string;
  user_id: string;
  policy_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Quote {
  id: string;
  user_id: string;
  quote_id: string;
  segment: string;
  business_name?: string;
  carrier?: string;
  application_details: string;
  premium: number | null;
  coverage_summary: string | null;
  ai_summary?: any; // JSON object with detailed coverage analysis
  eligibility: string;
  status: string;
  bound_at: string | null;
  created_at: string;
  updated_at: string;
}



export interface Document {
  id: string;
  user_id: string;
  policy_id: string | null;
  name: string;
  type: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarrierResource {
  id: string;
  carrier_name: string;
  segment: string;
  name: string;
  description: string | null;
  resource_type: 'Marketing' | 'Definitions' | 'Step-by-Step Guides' | 'Forms' | 'Training' | 'Other';
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Carrier {
  id: string;
  name: string;
  logo_url: string | null;
  segments: string[];
  rating: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}




export interface CarrierOption {
  id: string;
  name: string;
  logo_url: string | null;
  rating: number | null;
  description: string | null;
}

export interface QuoteAnalysisResult {
  quoteId: string;
  segment: string;
  premium: number;
  coverageSummary: string;
  eligibility: 'Approved' | 'Review Required' | 'Declined';
  riskFactors: string;
  analyzedAt: string;
  carrier?: string;
  carrierId?: string | null;
  carrierOptions?: CarrierOption[];
}


export interface Segment {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Public quote intake URL (Connect Quote tab). */
  quoteUrl?: string;
}

// Dynamic segments — no longer hardcoded.
// Segments are fetched from the database via getDistinctSegments() in api.ts.
// The old hardcoded SEGMENTS array (bar, plumber, roofer, etc.) has been removed.
// If you need a static fallback, use getDistinctSegments() which queries
// the policies and quotes tables for actual segment values.

