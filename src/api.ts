// src/api.ts - CID Connect API Integration Layer

import { supabase } from '@/lib/supabase';
import { Quote, Policy, Document, Claim, COIRequest, CarrierResource, CarrierOption, Carrier } from '@/types';




// ============================================
// DYNAMIC SEGMENT CONFIGURATION
// ============================================

// Segment backend URLs are now fetched from app_settings table.
// To configure a segment backend, add a row to app_settings:
//   key: 'segment_backend_<segment>'  (e.g., 'segment_backend_bar')
//   value: 'https://your-backend-url.com'
//
// The old hardcoded SEGMENT_API_MAP (Plumber, Roofer, Bar Render URLs) has been removed.

// Cache for segment backend URLs (refreshed on demand)
let _segmentBackendCache: Record<string, string> | null = null;
let _segmentBackendCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch segment backend URLs from app_settings table.
 * Looks for keys matching 'segment_backend_*' pattern.
 * Results are cached for 5 minutes.
 */
async function getSegmentBackendMap(): Promise<Record<string, string>> {
    const now = Date.now();
    if (_segmentBackendCache && (now - _segmentBackendCacheTime) < CACHE_TTL_MS) {
        return _segmentBackendCache;
    }

    const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'segment_backend_%');

    const map: Record<string, string> = {};
    if (!error && data) {
        for (const row of data) {
            // Extract segment name from key: 'segment_backend_bar' -> 'Bar'
            const segName = row.key.replace('segment_backend_', '');
            const formatted = segName.charAt(0).toUpperCase() + segName.slice(1).toLowerCase();
            map[formatted] = row.value;
        }
    }

    _segmentBackendCache = map;
    _segmentBackendCacheTime = now;
    return map;
}

/**
 * Clear the segment backend cache (call after updating app_settings)
 */
export function clearSegmentBackendCache(): void {
    _segmentBackendCache = null;
    _segmentBackendCacheTime = 0;
}

// Function to dynamically get the correct base URL for a segment
const getBaseUrl = async (segment: string): Promise<string> => {
    const map = await getSegmentBackendMap();
    const formatted = segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    
    // Try exact match first, then fallback to first available backend
    if (map[formatted]) return map[formatted];
    
    // Fallback: use the first configured backend if available
    const fallback = Object.values(map)[0];
    if (fallback) return fallback;
    
    // No backends configured — return empty string (will cause fetch to fail gracefully)
    console.warn(`No backend URL configured for segment "${segment}". Add 'segment_backend_${segment.toLowerCase()}' to app_settings.`);
    return '';
};

/**
 * Fetch distinct segment values from policies and quotes tables.
 * Returns an array of Segment objects with auto-generated display info.
 */
export async function getDistinctSegments(): Promise<import('@/types').Segment[]> {
    const [policiesRes, quotesRes] = await Promise.all([
        supabase.from('policies').select('segment'),
        supabase.from('quotes').select('segment')
    ]);

    const segmentSet = new Set<string>();

    if (policiesRes.data) {
        for (const row of policiesRes.data) {
            if (row.segment) segmentSet.add(row.segment.toLowerCase());
        }
    }
    if (quotesRes.data) {
        for (const row of quotesRes.data) {
            if (row.segment) segmentSet.add(row.segment.toLowerCase());
        }
    }

    // Convert to Segment objects with auto-generated display info
    const iconMap: Record<string, string> = {
        plumber: 'wrench', roofer: 'home', bar: 'wine',
        electrician: 'zap', hvac: 'thermometer', restaurant: 'utensils',
        autoshop: 'car', landscaper: 'trees', bakery: 'cake',
    };

    return Array.from(segmentSet).sort().map(seg => ({
        id: seg,
        name: `${seg.charAt(0).toUpperCase() + seg.slice(1)} Insurance Direct`,
        icon: iconMap[seg] || 'shield',
        description: `Coverage for ${seg} businesses`
    }));
}

/**
 * Get a dynamic color class for a segment badge.
 * Uses a deterministic hash so the same segment always gets the same color.
 */
export function getSegmentColorClass(segment: string): string {
    const PALETTE = [
        'bg-blue-100 text-blue-800',
        'bg-purple-100 text-purple-800',
        'bg-orange-100 text-orange-800',
        'bg-green-100 text-green-800',
        'bg-cyan-100 text-cyan-800',
        'bg-red-100 text-red-800',
        'bg-yellow-100 text-yellow-800',
        'bg-emerald-100 text-emerald-800',
        'bg-lime-100 text-lime-800',
        'bg-pink-100 text-pink-800',
        'bg-indigo-100 text-indigo-800',
        'bg-teal-100 text-teal-800',
    ];

    if (!segment) return 'bg-gray-100 text-gray-600';

    // Simple hash to pick a consistent color
    let hash = 0;
    const s = segment.toLowerCase();
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}



// ============================================
// SUPABASE DATABASE FUNCTIONS
// ============================================

/**
 * Fetch quote details by ID from Supabase
 * @param id - The quote ID (can be either the UUID 'id' or the string 'quote_id')
 * @returns Quote object with carrier and premium
 */
export async function getQuoteDetails(id: string): Promise<Quote | null> {
    // First try to find by quote_id (the human-readable ID like "QT-123456")
    let { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('quote_id', id)
        .single();

    // If not found by quote_id, try by UUID id
    if (error || !data) {
        const result = await supabase
            .from('quotes')
            .select('*')
            .eq('id', id)
            .single();
        
        data = result.data;
        error = result.error;
    }

    if (error) {
        console.error('Error fetching quote details:', error);
        return null;
    }

    return data as Quote;
}

/**
 * Bind a quote and create a new policy record
 * @param quoteId - The quote_id string (e.g., "QT-123456")
 * @param userId - The user's UUID
 * @param carrierId - Optional carrier UUID from the carriers table
 * @param carrierName - Optional carrier name override
 * @returns The newly created policy or null on error
 */
export async function bindQuote(quoteId: string, userId: string, carrierId?: string | null, carrierName?: string): Promise<Policy | null> {
    // First, fetch the quote details
    const quote = await getQuoteDetails(quoteId);
    
    if (!quote) {
        throw new Error('Quote not found');
    }

    if (quote.eligibility === 'Declined') {
        throw new Error('Cannot bind a declined quote');
    }

    // Generate a policy number
    const policyNumber = `POL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Calculate effective and expiration dates
    const effectiveDate = new Date();
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    // Extract business name from application details or use a default
    const businessName = quote.business_name || extractBusinessName(quote.application_details) || 'Business';

    // Resolve carrier name: explicit override > quote carrier > default
    const resolvedCarrier = carrierName || quote.carrier || 'CID Insurance Partners';

    // Create the policy record
    const insertData: any = {
        user_id: userId,
        policy_number: policyNumber,
        segment: quote.segment,
        business_name: businessName,
        carrier: resolvedCarrier,
        effective_date: effectiveDate.toISOString().split('T')[0],
        expiration_date: expirationDate.toISOString().split('T')[0],
        premium: quote.premium || 0,
        status: 'active',
        general_liability_limit: '$1,000,000',
        property_limit: '$500,000',
        deductible: 1000,
        payment_frequency: 'monthly',
        next_payment_date: getNextPaymentDate(),
        next_payment_amount: quote.premium ? Math.round(quote.premium / 12) : 0
    };

    // Add carrier_id if provided
    if (carrierId) {
        insertData.carrier_id = carrierId;
    }

    const { data: policy, error: policyError } = await supabase
        .from('policies')
        .insert(insertData)
        .select()
        .single();

    if (policyError) {
        console.error('Error creating policy:', policyError);
        throw new Error('Failed to create policy record');
    }

    // Update the quote status to 'bound'
    const { error: updateError } = await supabase
        .from('quotes')
        .update({ 
            status: 'bound',
            bound_at: new Date().toISOString()
        })
        .eq('quote_id', quoteId);

    if (updateError) {
        console.error('Error updating quote status:', updateError);
        // Don't throw here - policy was created successfully
    }

    return policy as Policy;
}


/**
 * Helper function to extract business name from application details
 */
function extractBusinessName(applicationDetails: string): string | null {
    // Try to find common patterns for business names
    const patterns = [
        /business\s*name[:\s]+([^,.\n]+)/i,
        /company[:\s]+([^,.\n]+)/i,
        /^([A-Z][a-zA-Z\s&]+(?:LLC|Inc|Corp|Co\.?)?)/m,
    ];

    for (const pattern of patterns) {
        const match = applicationDetails.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return null;
}

/**
 * Helper function to get the next payment date (first of next month)
 */
function getNextPaymentDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
    return date.toISOString().split('T')[0];
}

/**
 * Get all quotes for a user
 */
export async function getUserQuotes(userId: string): Promise<Quote[]> {
    const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user quotes:', error);
        return [];
    }

    return data as Quote[];
}

/**
 * Get all policies for a user
 */
export async function getUserPolicies(userId: string): Promise<Policy[]> {
    const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user policies:', error);
        return [];
    }
    return data as Policy[];
}

/**
 * Get the ai_summary from a user's most recent bound quote
 */
export async function getAiSummaryForPolicy(userId: string, policySegment?: string): Promise<any | null> {
    let query = supabase
        .from('quotes')
        .select('ai_summary, segment')
        .eq('user_id', userId)
        .eq('status', 'bound')
        .not('ai_summary', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

    if (policySegment) {
        query = query.eq('segment', policySegment);
    }

    const { data, error } = await query.single();

    if (error) {
        console.error('Error fetching AI summary:', error);
        return null;
    }

    return data?.ai_summary || null;
}

// ============================================
// DOCUMENT FUNCTIONS
// ============================================

/**
 * Get all documents for a user from the documents table
 * @param userId - The user's UUID
 * @returns Array of Document objects
 */
export async function getUserDocuments(userId: string): Promise<Document[]> {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user documents:', error);
        return [];
    }

    return data as Document[];
}

/**
 * Generate a Supabase Signed URL for secure document download
 * @param path - The file path in Supabase storage (e.g., "user_id/filename.pdf")
 * @returns Signed URL string that expires in 60 seconds, or null on error
 */
export async function getDownloadUrl(path: string): Promise<string | null> {
    // The bucket name for policy documents
    const BUCKET_NAME = 'policy-documents';
    
    const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 60); // URL expires in 60 seconds

    if (error) {
        console.error('Error generating signed URL:', error);
        return null;
    }

    return data.signedUrl;
}

/**
 * Download a document by triggering the browser download
 * @param path - The file path in Supabase storage
 * @param filename - The name to save the file as
 * @returns Boolean indicating success
 */
export async function downloadDocumentFile(path: string, filename: string): Promise<boolean> {
    const signedUrl = await getDownloadUrl(path);
    
    if (!signedUrl) {
        return false;
    }

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
}

// ============================================
// CARRIER RESOURCES FUNCTIONS
// ============================================

/**
 * Get carrier resources matching the user's carrier and segment
 * @param carrierName - The carrier name from the user's policy
 * @param segment - The segment from the user's policy
 * @returns Array of CarrierResource objects
 */
export async function getCarrierResources(carrierName: string, segment: string): Promise<CarrierResource[]> {
    const { data, error } = await supabase
        .from('carrier_resources')
        .select('*')
        .eq('carrier_name', carrierName)
        .eq('segment', segment)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('resource_type', { ascending: true });

    if (error) {
        console.error('Error fetching carrier resources:', error);
        return [];
    }

    return data as CarrierResource[];
}

/**
 * Generate a Supabase Signed URL for carrier resource download
 * Uses the same policy-documents bucket
 * @param path - The file path in Supabase storage
 * @returns Signed URL string that expires in 60 seconds, or null on error
 */
export async function getCarrierResourceDownloadUrl(path: string): Promise<string | null> {
    const BUCKET_NAME = 'policy-documents';
    
    const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 60); // URL expires in 60 seconds

    if (error) {
        console.error('Error generating carrier resource signed URL:', error);
        return null;
    }

    return data.signedUrl;
}

/**
 * Download a carrier resource by triggering the browser download
 * @param path - The file path in Supabase storage
 * @param filename - The name to save the file as
 * @returns Boolean indicating success
 */
export async function downloadCarrierResource(path: string, filename: string): Promise<boolean> {
    const signedUrl = await getCarrierResourceDownloadUrl(path);
    
    if (!signedUrl) {
        return false;
    }

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
}


// ============================================
// CLAIMS FUNCTIONS
// ============================================

export interface ClaimFormData {
    policyId: string;
    policyNumber: string;
    businessName: string;
    segment: string;
    typeOfLoss: string;
    dateOfIncident: string;
    locationOfIncident: string;
    detailedDescription: string;
    estimatedAmount?: number;
    thirdPartyName?: string;
    thirdPartyContact?: string;
    photos?: string[];
}

/**
 * Upload claim photos to cid-uploads bucket
 * @param userId - The user's UUID
 * @param claimNumber - The claim number for folder organization
 * @param files - Array of File objects to upload
 * @returns Array of storage paths for the uploaded files
 */
export async function uploadClaimPhotos(
    userId: string, 
    claimNumber: string, 
    files: File[]
): Promise<string[]> {
    const uploadedPaths: string[] = [];
    
    for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${userId}/${claimNumber}/${fileName}`;
        
        const { error } = await supabase
            .storage
            .from('cid-uploads')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error('Error uploading file:', error);
            continue;
        }
        
        uploadedPaths.push(filePath);
    }
    
    return uploadedPaths;
}

/**
 * Get signed URL for claim photo
 */
export async function getClaimPhotoUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase
        .storage
        .from('cid-uploads')
        .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
        console.error('Error generating claim photo URL:', error);
        return null;
    }

    return data.signedUrl;
}

/**
 * Submit a claim to the database and notify the segment backend
 */
export async function submitClaim(
    userId: string, 
    claimData: ClaimFormData
): Promise<{ claim: Claim | null; backendResponse: any }> {
    // Generate claim number
    const claimNumber = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Insert claim into database
    const { data: claim, error: dbError } = await supabase
        .from('claims')
        .insert({
            user_id: userId,
            policy_id: claimData.policyId,
            claim_number: claimNumber,
            segment: claimData.segment,
            incident_date: claimData.dateOfIncident,
            incident_location: claimData.locationOfIncident,
            description: claimData.detailedDescription,
            claim_type: claimData.typeOfLoss,
            estimated_amount: claimData.estimatedAmount || null,
            third_party_name: claimData.thirdPartyName || null,
            third_party_contact: claimData.thirdPartyContact || null,
            photos: claimData.photos || [],
            status: 'submitted',
            backend_notified: false
        })
        .select()
        .single();

    if (dbError) {
        console.error('Error saving claim to database:', dbError);
        throw new Error('Failed to save claim');
    }

    // Notify the segment-specific backend
    let backendResponse = null;
    const formattedSegment = formatSegmentForApi(claimData.segment);
    
    try {
        const response = await fileClaim(userId, formattedSegment, {
            claimNumber,
            policyId: claimData.policyId,
            policyNumber: claimData.policyNumber,
            businessName: claimData.businessName,
            typeOfLoss: claimData.typeOfLoss,
            dateOfIncident: claimData.dateOfIncident,
            locationOfIncident: claimData.locationOfIncident,
            detailedDescription: claimData.detailedDescription,
            estimatedAmount: claimData.estimatedAmount,
            photos: claimData.photos
        });
        
        backendResponse = response;
        
        // Update claim with backend notification status
        await supabase
            .from('claims')
            .update({ 
                backend_notified: true,
                backend_response: response
            })
            .eq('id', claim.id);
            
    } catch (apiError: any) {
        console.error('Backend notification failed:', apiError);
        backendResponse = { 
            error: apiError.message, 
            warning: true,
            message: 'Claim saved. Backend notification pending.'
        };
    }

    return { claim: claim as Claim, backendResponse };
}

/**
 * Get all claims for a user
 */
export async function getUserClaims(userId: string): Promise<Claim[]> {
    const { data, error } = await supabase
        .from('claims')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user claims:', error);
        return [];
    }

    return data as Claim[];
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get user profile including role
 */
export async function getUserProfile(userId: string): Promise<{ role: string } | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error) {
        // If no profile exists, return default role
        return { role: 'agent' };
    }

    return data;
}

/**
 * Check if user is staff or admin
 */
export async function isStaffOrAdmin(userId: string): Promise<boolean> {
    const profile = await getUserProfile(userId);
    return profile?.role === 'staff' || profile?.role === 'admin';
}

/**
 * Get all policies (admin only)
 */
export async function getAllPolicies(): Promise<Policy[]> {
    const { data, error } = await supabase
        .from('policies')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all policies:', error);
        return [];
    }

    return data as Policy[];
}

export interface BindTokenRow {
  id: string;
  intended_email: string;
  policy_id: string | null;
  quote_id: string | null;
  segment: string | null;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export interface BindTokenListResult {
  rows: BindTokenRow[];
  total: number;
}

export async function getBindTokens(opts?: {
  status?: 'all' | 'pending' | 'redeemed' | 'expired';
  search?: string;
  limit?: number;
}): Promise<BindTokenListResult> {
  const limit = opts?.limit ?? 200;
  let query = supabase
    .from('policy_bind_tokens')
    .select('id,intended_email,policy_id,quote_id,segment,expires_at,used_at,used_by,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts?.search?.trim()) {
    query = query.ilike('intended_email', `%${opts.search.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('Error fetching bind tokens:', error);
    return { rows: [], total: 0 };
  }

  let rows = (data || []) as BindTokenRow[];
  if (opts?.status && opts.status !== 'all') {
    const now = Date.now();
    rows = rows.filter((row) => {
      const expired = new Date(row.expires_at).getTime() <= now;
      const redeemed = !!row.used_at;
      if (opts.status === 'redeemed') return redeemed;
      if (opts.status === 'expired') return !redeemed && expired;
      if (opts.status === 'pending') return !redeemed && !expired;
      return true;
    });
  }
  return { rows, total: count ?? rows.length };
}

export async function createBindTokenRecord(params: {
  tokenHash: string;
  intendedEmail: string;
  policyId: string;
  expiresAtIso: string;
  segment?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('policy_bind_tokens')
    .insert({
      token_hash: params.tokenHash,
      intended_email: params.intendedEmail.toLowerCase(),
      policy_id: params.policyId,
      expires_at: params.expiresAtIso,
      segment: params.segment ?? null,
      created_by: 'admin-ui',
    });
  if (error) {
    console.error('Error creating bind token:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function revokeBindToken(tokenId: string): Promise<boolean> {
  const { error } = await supabase
    .from('policy_bind_tokens')
    .delete()
    .eq('id', tokenId)
    .is('used_at', null);
  if (error) {
    console.error('Error revoking bind token:', error);
    return false;
  }
  return true;
}

export interface BindTokenResult {
  ok: boolean;
  error?: 'email_mismatch' | 'token_expired' | 'token_already_used' | 'token_not_found' | string;
  policy_id?: string | null;
  segment?: string | null;
}

export async function validateBindToken(token: string, email: string): Promise<BindTokenResult> {
  const { data, error } = await supabase.functions.invoke('redeem-bind-token', {
    body: { action: 'validate', token, email },
  });
  if (error) return { ok: false, error: error.message };
  const mapped = data?.error === 'invalid_token' ? 'token_not_found' : data?.error;
  return { ok: Boolean(data?.ok), error: mapped, policy_id: data?.policy_id, segment: data?.segment };
}

export async function redeemBindToken(token: string, email: string, userId: string): Promise<BindTokenResult> {
  const { data, error } = await supabase.functions.invoke('redeem-bind-token', {
    body: { action: 'redeem', token, email, user_id: userId },
  });
  if (error) return { ok: false, error: error.message };
  const mapped = data?.error === 'invalid_token' ? 'token_not_found' : data?.error;
  return { ok: Boolean(data?.ok), error: mapped, policy_id: data?.policy_id, segment: data?.segment };
}

/**
 * Get all claims (admin only)
 */
export async function getAllClaims(): Promise<Claim[]> {
    const { data, error } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all claims:', error);
        return [];
    }

    return data as Claim[];
}

/**
 * Get dashboard stats for admin
 */
export async function getAdminDashboardStats(): Promise<{
    totalPolicies: number;
    activePolicies: number;
    totalClaims: number;
    pendingClaims: number;
    policyBySegment: Record<string, number>;
    claimsBySegment: Record<string, number>;
}> {
    // Get all policies
    const policies = await getAllPolicies();
    const claims = await getAllClaims();

    const activePolicies = policies.filter(p => p.status === 'active');
    const pendingClaims = claims.filter(c => c.status === 'submitted' || c.status === 'pending' || c.status === 'under_review');

    // Group by segment
    const policyBySegment: Record<string, number> = {};
    const claimsBySegment: Record<string, number> = {};

    policies.forEach(p => {
        const seg = p.segment || 'Unknown';
        policyBySegment[seg] = (policyBySegment[seg] || 0) + 1;
    });

    claims.forEach(c => {
        const seg = c.segment || 'Unknown';
        claimsBySegment[seg] = (claimsBySegment[seg] || 0) + 1;
    });

    return {
        totalPolicies: policies.length,
        activePolicies: activePolicies.length,
        totalClaims: claims.length,
        pendingClaims: pendingClaims.length,
        policyBySegment,
        claimsBySegment
    };
}


// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

/**
 * Get user email by user ID (admin helper)
 */
export async function getUserEmailById(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user email:', error);
    return null;
  }

  return data.email;
}

/**
 * Send a status notification email via the send-notification edge function.
 * Called from admin dashboard after status updates.
 * Uses the Supabase auth token for authentication (admin/staff only).
 */
export async function sendStatusNotification(params: {
  user_email: string;
  reference_number: string;
  entity_type: 'coi' | 'claim' | 'policy';
  new_status: string;
  user_name?: string;
  extra_context?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: params
    });

    if (error) {
      console.error('send-notification edge function error:', error);
      return { success: false, error: error.message };
    }

    return { success: data?.sent === true, error: data?.error };
  } catch (err: any) {
    console.error('sendStatusNotification error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a bind confirmation email (fire-and-forget).
 * Called after a quote is successfully bound into a policy.
 */
export async function notifyBindSuccess(params: {
  userEmail: string;
  policyNumber: string;
  carrierName: string;
  premiumDisplay: string;
  effectiveDate: string;
  userName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const extraLines = [
    `Policy Number: ${params.policyNumber}`,
    `Carrier: ${params.carrierName}`,
    `Annual Premium: ${params.premiumDisplay}`,
    `Effective Date: ${params.effectiveDate}`,
  ].join('\n');

  return sendStatusNotification({
    user_email: params.userEmail,
    reference_number: params.policyNumber,
    entity_type: 'policy',
    new_status: 'bound',
    user_name: params.userName,
    extra_context: extraLines,
  });
}


// ============================================
// ANALYTICS FUNCTIONS
export interface WeeklyDataPoint {
  week: string;       // e.g. "2026-W13"
  weekLabel: string;   // e.g. "Mar 23"
  count: number;
}

export interface MonthlyDataPoint {
  month: string;       // e.g. "2026-03"
  monthLabel: string;  // e.g. "Mar 2026"
  count: number;
}

export interface AnalyticsData {
  claimsPerWeek: WeeklyDataPoint[];
  coiPerWeek: WeeklyDataPoint[];
  policyBindsPerMonth: MonthlyDataPoint[];
  totalPremiumVolume: number;
  averageClaimAmount: number | null;
  totalClaimsWithAmount: number;
  totalClaimAmount: number;
  totalSettledAmount: number;
  totalClaimsWithSettlement: number;
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Fetch analytics data for the admin dashboard.
 * Groups claims by week, COI requests by week, and policy binds by month.
 * Includes settlement stats.
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
  // Fetch all three datasets in parallel
  const [claimsRes, coiRes, policiesRes] = await Promise.all([
    supabase.from('claims').select('created_at, estimated_amount, settlement_amount').order('created_at', { ascending: true }),
    supabase.from('coi_requests').select('created_at').order('created_at', { ascending: true }),
    supabase.from('policies').select('created_at, premium, status').order('created_at', { ascending: true })
  ]);

  const claims = claimsRes.data || [];
  const coiReqs = coiRes.data || [];
  const policies = policiesRes.data || [];

  // --- Claims per week (last 12 weeks) ---
  const claimsWeekMap: Record<string, { count: number; mondayDate: string }> = {};
  for (const c of claims) {
    const d = new Date(c.created_at);
    const week = getISOWeek(d);
    const monday = getMonday(d);
    if (!claimsWeekMap[week]) {
      claimsWeekMap[week] = { count: 0, mondayDate: monday.toISOString() };
    }
    claimsWeekMap[week].count++;
  }

  const allClaimWeeks = Object.entries(claimsWeekMap)
    .map(([week, v]) => ({
      week,
      weekLabel: getWeekLabel(v.mondayDate),
      count: v.count
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12);

  // --- COI requests per week (last 12 weeks) ---
  const coiWeekMap: Record<string, { count: number; mondayDate: string }> = {};
  for (const c of coiReqs) {
    const d = new Date(c.created_at);
    const week = getISOWeek(d);
    const monday = getMonday(d);
    if (!coiWeekMap[week]) {
      coiWeekMap[week] = { count: 0, mondayDate: monday.toISOString() };
    }
    coiWeekMap[week].count++;
  }

  const allCoiWeeks = Object.entries(coiWeekMap)
    .map(([week, v]) => ({
      week,
      weekLabel: getWeekLabel(v.mondayDate),
      count: v.count
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12);

  // --- Policy binds per month (last 12 months) ---
  const policyMonthMap: Record<string, number> = {};
  let totalPremium = 0;

  for (const p of policies) {
    const d = new Date(p.created_at);
    const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    policyMonthMap[monthKey] = (policyMonthMap[monthKey] || 0) + 1;
    if (p.premium) {
      totalPremium += Number(p.premium);
    }
  }

  const allPolicyMonths = Object.entries(policyMonthMap)
    .map(([month, count]) => {
      const [y, m] = month.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return {
        month,
        monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // --- Claim amount stats ---
  let totalClaimAmount = 0;
  let totalClaimsWithAmount = 0;
  let totalSettledAmount = 0;
  let totalClaimsWithSettlement = 0;

  for (const c of claims) {
    if (c.estimated_amount && Number(c.estimated_amount) > 0) {
      totalClaimAmount += Number(c.estimated_amount);
      totalClaimsWithAmount++;
    }
    if (c.settlement_amount && Number(c.settlement_amount) > 0) {
      totalSettledAmount += Number(c.settlement_amount);
      totalClaimsWithSettlement++;
    }
  }

  return {
    claimsPerWeek: allClaimWeeks,
    coiPerWeek: allCoiWeeks,
    policyBindsPerMonth: allPolicyMonths,
    totalPremiumVolume: totalPremium,
    averageClaimAmount: totalClaimsWithAmount > 0 ? totalClaimAmount / totalClaimsWithAmount : null,
    totalClaimsWithAmount,
    totalClaimAmount,
    totalSettledAmount,
    totalClaimsWithSettlement
  };
}



/**
 * Update claim status (admin only)
 */
export async function updateClaimStatus(claimId: string, status: string, notes?: string): Promise<boolean> {
    const { error } = await supabase
        .from('claims')
        .update({ 
            status,
            notes: notes || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', claimId);

    if (error) {
        console.error('Error updating claim status:', error);
        return false;
    }

    return true;
}


// ============================================
// ADMIN COI REQUEST FUNCTIONS
// ============================================

/**
 * Get all COI requests (admin/staff only)
 */
export async function getAllCoiRequests(): Promise<COIRequest[]> {
    const { data, error } = await supabase
        .from('coi_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all COI requests:', error);
        return [];
    }

    return data as COIRequest[];
}

/**
 * Update COI request status (admin/staff only)
 */
export async function updateCoiRequestStatus(requestId: string, status: string): Promise<boolean> {
    const { error } = await supabase
        .from('coi_requests')
        .update({ 
            status,
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (error) {
        console.error('Error updating COI request status:', error);
        return false;
    }

    return true;
}

/**
 * Update COI request generated PDF URL (admin/staff only)
 */
export async function updateCoiRequestPdfUrl(requestId: string, pdfUrl: string): Promise<boolean> {
    const { error } = await supabase
        .from('coi_requests')
        .update({ 
            generated_pdf_url: pdfUrl,
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (error) {
        console.error('Error updating COI request PDF URL:', error);
        return false;
    }

    return true;
}



// ============================================
// COI REQUEST FUNCTIONS
// ============================================

export interface CoiFormData {
    holderName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    certificateType: string;
    additionalInstructions: string;
}

// Legacy interface kept for backward compatibility
export interface CoiRequestData {
    userId: string;
    policyId: string;
    recipientName: string;
    recipientEmail: string;
    certificateHolderAddress?: string;
    specialRequirements?: string;
}

/**
 * Upload a COI requirements file to cid-uploads bucket
 * @param userId - The user's UUID
 * @param requestNumber - The COI request number for folder organization
 * @param file - The File object to upload
 * @returns The storage path of the uploaded file, or null on error
 */
export async function uploadCoiFile(
    userId: string,
    requestNumber: string,
    file: File
): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${userId}/coi/${requestNumber}/${fileName}`;

    const { error } = await supabase
        .storage
        .from('cid-uploads')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Error uploading COI file:', error);
        return null;
    }

    return filePath;
}

/**
 * Submit a COI request: saves to DB, uploads file, and notifies segment backend
 * 
 * POST flow:
 * 1. Generate request number (COI-XXXXXX-XXXX)
 * 2. Upload file to cid-uploads bucket (if provided)
 * 3. INSERT into coi_requests table
 * 4. POST to segment backend /request-coi endpoint
 * 5. UPDATE coi_requests with backend_notified = true
 * 
 * @param userId - The authenticated user's UUID
 * @param policyId - The policy UUID (nullable if user has no policy yet)
 * @param segment - The policy segment (e.g., 'plumber', 'bar')
 * @param formData - The form fields from the COI request form
 * @param file - Optional uploaded requirements file
 * @returns The created COIRequest record and backend response
 */
export async function submitCoiRequest(
    userId: string,
    policyId: string | null,
    segment: string | null,
    formData: CoiFormData,
    file?: File | null
): Promise<{ coiRequest: COIRequest; backendResponse: any }> {
    
    // Step 1: Generate request number
    const requestNumber = `COI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Step 2: Upload file if provided
    let uploadedFilePath: string | null = null;
    let uploadedFileName: string | null = null;

    if (file) {
        uploadedFilePath = await uploadCoiFile(userId, requestNumber, file);
        uploadedFileName = file.name;
    }

    // Step 3: Build the full address string
    const fullAddress = [
        formData.address,
        formData.city,
        formData.state,
        formData.zip
    ].filter(Boolean).join(', ');

    // Step 4: INSERT into coi_requests table
    const { data: coiRequest, error: dbError } = await supabase
        .from('coi_requests')
        .insert({
            user_id: userId,
            policy_id: policyId,
            request_number: requestNumber,
            certificate_holder_name: formData.holderName,
            certificate_holder_address: formData.address || null,
            certificate_holder_city: formData.city || null,
            certificate_holder_state: formData.state || null,
            certificate_holder_zip: formData.zip || null,
            delivery_email: formData.email,
            certificate_type: formData.certificateType || 'standard',
            additional_instructions: formData.additionalInstructions || null,
            uploaded_file_path: uploadedFilePath,
            uploaded_file_name: uploadedFileName,
            status: 'submitted',
            segment: segment || null,
            backend_notified: false
        })
        .select()
        .single();

    if (dbError) {
        console.error('Error saving COI request to database:', dbError);
        throw new Error(`Failed to save COI request: ${dbError.message}`);
    }

    // Step 5: Notify the segment-specific backend
    let backendResponse: any = null;
    const formattedSegment = formatSegmentForApi(segment || '');

    try {
        const response = await requestCoi(formattedSegment, {
            userId,
            policyId: policyId || '',
            recipientName: formData.holderName,
            recipientEmail: formData.email,
            certificateHolderAddress: fullAddress,
            specialRequirements: [
                formData.certificateType !== 'standard' ? `Type: ${formData.certificateType}` : '',
                formData.additionalInstructions || ''
            ].filter(Boolean).join('\n')
        });

        backendResponse = response;

        // Step 6: Update record with backend notification status
        await supabase
            .from('coi_requests')
            .update({
                backend_notified: true,
                backend_response: response,
                status: 'processing',
                updated_at: new Date().toISOString()
            })
            .eq('id', coiRequest.id);

    } catch (apiError: any) {
        console.error('Backend COI notification failed:', apiError);
        backendResponse = {
            error: apiError.message,
            warning: true,
            message: 'COI request saved. Backend notification pending — our team will process it manually.'
        };

        // Still update the record to note the attempt
        await supabase
            .from('coi_requests')
            .update({
                backend_response: backendResponse,
                updated_at: new Date().toISOString()
            })
            .eq('id', coiRequest.id);
    }

    return { coiRequest: coiRequest as COIRequest, backendResponse };
}

/**
 * Get all COI requests for a user
 */
export async function getUserCoiRequests(userId: string): Promise<COIRequest[]> {
    const { data, error } = await supabase
        .from('coi_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user COI requests:', error);
        return [];
    }

    return data as COIRequest[];
}

/**
 * POST to segment backend /request-coi endpoint
 */
export async function requestCoi(segment: string, coiData: CoiRequestData) {
    
    const BASE_URL = await getBaseUrl(segment);

    if (!BASE_URL) {
        throw new Error(`No backend configured for segment "${segment}". Add segment_backend_${segment.toLowerCase()} to app_settings.`);
    }

    const response = await fetch(`${BASE_URL}/request-coi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coiData)
    });

    if (!response.ok) {
        throw new Error(`Failed to process COI request. Backend: ${BASE_URL}.`);
    }

    // Backend returns a status message (e.g., "COI request received...")
    return response.json();
}




// 2. Function to handle Claim Filing
export async function fileClaim(userId: string, segment: string, claimData: any) {
    
    const BASE_URL = await getBaseUrl(segment);

    if (!BASE_URL) {
        throw new Error(`No backend configured for segment "${segment}". Add segment_backend_${segment.toLowerCase()} to app_settings.`);
    }

    const response = await fetch(`${BASE_URL}/file-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, claimDetails: claimData })
    });

    if (!response.ok) {
        throw new Error(`Failed to file claim. Backend: ${BASE_URL}.`);
    }

    // Backend returns a status message (e.g., "Claim request successfully filed...")
    return response.json();
}

// 3. Function to get renewal quotes
export async function getRenewalQuotes(userId: string, policyId: string, segment: string) {
    
    const BASE_URL = await getBaseUrl(segment);

    if (!BASE_URL) {
        throw new Error(`No backend configured for segment "${segment}".`);
    }

    const response = await fetch(`${BASE_URL}/renewal-quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, policyId })
    });

    if (!response.ok) {
        throw new Error(`Failed to get renewal quotes. Backend: ${BASE_URL}.`);
    }

    return response.json();
}

// 4. Function to bind a renewal policy
export async function bindRenewal(userId: string, policyId: string, segment: string, selectedQuoteId: string) {
    
    const BASE_URL = await getBaseUrl(segment);

    if (!BASE_URL) {
        throw new Error(`No backend configured for segment "${segment}".`);
    }

    const response = await fetch(`${BASE_URL}/bind-renewal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, policyId, selectedQuoteId })
    });

    if (!response.ok) {
        throw new Error(`Failed to bind renewal. Backend: ${BASE_URL}.`);
    }

    return response.json();
}

// 5. Function to download policy documents
export async function downloadDocument(userId: string, policyId: string, documentType: string, segment: string) {
    
    const BASE_URL = await getBaseUrl(segment);

    if (!BASE_URL) {
        throw new Error(`No backend configured for segment "${segment}".`);
    }

    const response = await fetch(`${BASE_URL}/download-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, policyId, documentType })
    });

    if (!response.ok) {
        throw new Error(`Failed to download document. Backend: ${BASE_URL}.`);
    }

    return response.json();
}

// 6. Function to update payment method
export async function updatePaymentMethod(userId: string, policyId: string, paymentData: any, segment: string) {
    
    const BASE_URL = await getBaseUrl(segment);

    if (!BASE_URL) {
        throw new Error(`No backend configured for segment "${segment}".`);
    }

    const response = await fetch(`${BASE_URL}/update-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, policyId, paymentData })
    });

    if (!response.ok) {
        throw new Error(`Failed to update payment method. Backend: ${BASE_URL}.`);
    }

    return response.json();
}

// 7. Function to set renewal reminders
export async function setRenewalReminders(userId: string, policyId: string, reminderPreferences: any, segment: string) {
    
    const BASE_URL = await getBaseUrl(segment);

    if (!BASE_URL) {
        throw new Error(`No backend configured for segment "${segment}".`);
    }

    const response = await fetch(`${BASE_URL}/renewal-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, policyId, reminderPreferences })
    });

    if (!response.ok) {
        throw new Error(`Failed to set renewal reminders. Backend: ${BASE_URL}.`);
    }

    return response.json();
}

// 8. Function to get AI coverage analysis
export async function getCoverageAnalysis(userId: string, policyId: string, question: string, segment: string) {
    
    const BASE_URL = await getBaseUrl(segment);

    if (!BASE_URL) {
        throw new Error(`No backend configured for segment "${segment}".`);
    }

    const response = await fetch(`${BASE_URL}/coverage-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, policyId, question })
    });

    if (!response.ok) {
        throw new Error(`Failed to get coverage analysis. Backend: ${BASE_URL}.`);
    }

    return response.json();
}

// Helper function to format segment name for API
export function formatSegmentForApi(segment: string): string {
    if (!segment) return ''; // No default fallback — segments are dynamic now
    // Capitalize first letter to match API map keys (e.g., 'plumber' -> 'Plumber')
    return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
}



// ============================================
// SETTLEMENT FUNCTIONS (Admin)
// ============================================

/**
 * Update settlement amount and date on a claim (admin only)
 */
export async function updateClaimSettlement(
  claimId: string,
  settlementAmount: number | null,
  settlementDate: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from('claims')
    .update({
      settlement_amount: settlementAmount,
      settlement_date: settlementDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', claimId);

  if (error) {
    console.error('Error updating claim settlement:', error);
    return false;
  }

  return true;
}

// ============================================
// ENTITY LOOKUP BY ID
// ============================================

/**
 * Get a single claim by its UUID
 */
export async function getClaimById(claimId: string): Promise<Claim | null> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .single();

  if (error) {
    console.error('Error fetching claim by id:', error);
    return null;
  }

  return data as Claim;
}

/**
 * Get a single COI request by its UUID
 */
export async function getCoiRequestById(coiId: string): Promise<COIRequest | null> {
  const { data, error } = await supabase
    .from('coi_requests')
    .select('*')
    .eq('id', coiId)
    .single();

  if (error) {
    console.error('Error fetching COI request by id:', error);
    return null;
  }

  return data as COIRequest;
}

/**
 * Get a single policy by its UUID
 */
export async function getPolicyById(policyId: string): Promise<Policy | null> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('id', policyId)
    .single();

  if (error) {
    console.error('Error fetching policy by id:', error);
    return null;
  }

  return data as Policy;

}

// ============================================
// CARRIER FUNCTIONS
// ============================================

/**
 * Get a single carrier by its UUID
 */
export async function getCarrierById(carrierId: string): Promise<Carrier | null> {
  const { data, error } = await supabase
    .from('carriers')
    .select('*')
    .eq('id', carrierId)
    .single();

  if (error) {
    console.error('Error fetching carrier by id:', error);
    return null;
  }

  return data as Carrier;
}

/**
 * Get all active carriers
 */
export async function getActiveCarriers(): Promise<Carrier[]> {
  const { data, error } = await supabase
    .from('carriers')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (error) {
    console.error('Error fetching active carriers:', error);
    return [];
  }

  return data as Carrier[];
}

/**
 * Get policies associated with a specific carrier
 */
export async function getCarrierPolicies(carrierId: string): Promise<Policy[]> {
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('carrier_id', carrierId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching carrier policies:', error);
    return [];
  }

  return data as Policy[];
}


// ============================================
// ACTIVITY FEED
// ============================================

export interface ActivityItem {
  id: string;
  type: 'claim' | 'coi' | 'policy';
  reference_number: string;
  status: string;
  description: string;
  timestamp: string; // ISO string
}

/**
 * Get recent activity for a user: claims, COI requests, and policies
 * merged and sorted by most recent update, limited to 10 items.
 */
export async function getUserRecentActivity(userId: string): Promise<ActivityItem[]> {
  const [claimsRes, coiRes, policiesRes] = await Promise.all([
    supabase
      .from('claims')
      .select('id, claim_number, status, description, updated_at, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('coi_requests')
      .select('id, request_number, status, certificate_holder_name, updated_at, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('policies')
      .select('id, policy_number, status, business_name, updated_at, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5)
  ]);

  const items: ActivityItem[] = [];

  for (const c of (claimsRes.data || [])) {
    items.push({
      id: c.id,
      type: 'claim',
      reference_number: c.claim_number || 'Pending',
      status: c.status,
      description: c.description?.substring(0, 60) || 'Claim filed',
      timestamp: c.updated_at || c.created_at
    });
  }

  for (const r of (coiRes.data || [])) {
    items.push({
      id: r.id,
      type: 'coi',
      reference_number: r.request_number,
      status: r.status,
      description: `COI for ${r.certificate_holder_name || 'N/A'}`,
      timestamp: r.updated_at || r.created_at
    });
  }

  for (const p of (policiesRes.data || [])) {
    items.push({
      id: p.id,
      type: 'policy',
      reference_number: p.policy_number,
      status: p.status,
      description: p.business_name || 'Policy',
      timestamp: p.updated_at || p.created_at
    });
  }

  // Sort by timestamp descending, take 10
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 10);
}

// ============================================
// CSV EXPORT HELPERS
// ============================================

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatMoneyCsv(amount: number | null | undefined): string {
  if (amount == null) return '';
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Download a settlement report as CSV.
 * Fetches all claims, filters to those with a settlement_amount,
 * and triggers a browser download.
 */
export async function downloadSettlementReportCsv(): Promise<void> {
  const claims = await getAllClaims();
  const settled = claims.filter(c => c.settlement_amount != null);

  const headers = [
    'Claim Number',
    'Segment',
    'Status',
    'Estimated Amount',
    'Settlement Amount',
    'Settlement Date',
    'Created At'
  ];

  const rows = settled.map(c => [
    escapeCsvCell(c.claim_number || 'N/A'),
    escapeCsvCell(c.segment || 'N/A'),
    escapeCsvCell(c.status),
    escapeCsvCell(formatMoneyCsv(c.estimated_amount)),
    escapeCsvCell(formatMoneyCsv(c.settlement_amount)),
    escapeCsvCell(c.settlement_date || 'N/A'),
    escapeCsvCell(new Date(c.created_at).toLocaleDateString())
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `settlement-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// HELPERS
// ============================================

/**
 * Format a timestamp into a human-readable relative time string.
 * e.g. "2 hours ago", "3 days ago", "just now"
 */
export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}


// ============================================
// ALL CLAIMS CSV EXPORT
// ============================================

/**
 * Download a full claims report as CSV (all claims, no filter).
 * Columns: claim_number, segment, status, claim_type, incident_date,
 *          estimated_amount, settlement_amount, settlement_date,
 *          description, created_at
 */
export async function downloadAllClaimsReportCsv(): Promise<void> {
  const claims = await getAllClaims();

  const headers = [
    'Claim Number',
    'Segment',
    'Status',
    'Claim Type',
    'Incident Date',
    'Estimated Amount',
    'Settlement Amount',
    'Settlement Date',
    'Description',
    'Created At'
  ];

  const rows = claims.map(c => [
    escapeCsvCell(c.claim_number || 'N/A'),
    escapeCsvCell(c.segment || 'N/A'),
    escapeCsvCell(c.status),
    escapeCsvCell(c.claim_type?.replace(/_/g, ' ') || 'N/A'),
    escapeCsvCell(c.incident_date || 'N/A'),
    escapeCsvCell(formatMoneyCsv(c.estimated_amount)),
    escapeCsvCell(formatMoneyCsv(c.settlement_amount)),
    escapeCsvCell(c.settlement_date || 'N/A'),
    escapeCsvCell(c.description || ''),
    escapeCsvCell(new Date(c.created_at).toLocaleDateString())
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `all-claims-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================
// ADMIN AUDIT LOG
// ============================================

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  admin_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

/**
 * Insert an entry into the admin_audit_log table.
 * Fire-and-forget — callers should catch errors silently.
 */
export async function logAdminAction(params: {
  admin_user_id: string;
  admin_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
}): Promise<void> {
  const { error } = await supabase
    .from('admin_audit_log')
    .insert({
      admin_user_id: params.admin_user_id,
      admin_email: params.admin_email || null,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      details: params.details || {}
    });

  if (error) {
    console.error('Error writing audit log:', error);
  }
}

/**
 * Fetch recent audit log entries (admin only).
 * Supports optional filters by action and entity_type.
 * Returns up to `limit` rows, default 50.
 */
export async function getRecentAuditLogs(opts?: {
  action?: string;
  entity_type?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const limit = opts?.limit ?? 50;

  let query = supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts?.action && opts.action !== 'all') {
    query = query.eq('action', opts.action);
  }
  if (opts?.entity_type && opts.entity_type !== 'all') {
    query = query.eq('entity_type', opts.entity_type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }

  return data as AuditLogEntry[];

}

// ============================================
// QUOTE PDF DOWNLOAD
// ============================================

/**
 * Download a quote summary PDF by invoking the generate-quote-pdf edge function.
 * The function returns a base64-encoded PDF which we decode and trigger a browser download.
 * @param quoteId - The quote_id string or UUID
 */
export async function downloadQuotePdf(quoteId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-quote-pdf', {
      body: { quote_id: quoteId }
    });

    if (error) {
      console.error('generate-quote-pdf error:', error);
      return false;
    }

    if (!data?.pdf_base64) {
      console.error('No PDF data returned');
      return false;
    }

    // Decode base64 to binary
    const binaryString = atob(data.pdf_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = data.filename || `quote-${quoteId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (err) {
    console.error('downloadQuotePdf error:', err);
    return false;
  }
}


// ============================================
// EMAIL TEMPLATES (Admin)
// ============================================

export interface EmailTemplate {
  id: string;
  entity_type: string;
  status_trigger: string;
  subject: string;
  html_body: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * List all email templates (admin only)
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('entity_type', { ascending: true })
    .order('status_trigger', { ascending: true });

  if (error) {
    console.error('Error fetching email templates:', error);
    return [];
  }

  return data as EmailTemplate[];
}

/**
 * Upsert (create or update) an email template.
 * Uses the unique(entity_type, status_trigger) constraint.
 */
export async function upsertEmailTemplate(template: {
  id?: string;
  entity_type: string;
  status_trigger: string;
  subject: string;
  html_body: string;
  description?: string;
  is_active?: boolean;
}): Promise<EmailTemplate | null> {
  const payload: any = {
    entity_type: template.entity_type,
    status_trigger: template.status_trigger.toLowerCase(),
    subject: template.subject,
    html_body: template.html_body,
    description: template.description || null,
    is_active: template.is_active ?? true,
    updated_at: new Date().toISOString()
  };

  if (template.id) {
    // Update existing
    const { data, error } = await supabase
      .from('email_templates')
      .update(payload)
      .eq('id', template.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating email template:', error);
      return null;
    }
    return data as EmailTemplate;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('email_templates')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating email template:', error);
      return null;
    }
    return data as EmailTemplate;
  }
}

/**
 * Delete an email template by ID
 */
export async function deleteEmailTemplate(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting email template:', error);
    return false;
  }

  return true;
}

/**
 * Preview an email template by interpolating placeholders with sample data.
 * Returns the rendered HTML string.
 */
export function previewEmailTemplate(htmlBody: string, subject: string): { subject: string; html: string } {
  const sampleVars: Record<string, string> = {
    reference_number: 'CLM-SAMPLE-1234',
    extra_context: 'Settlement amount: $5,000<br>Settlement date: 2026-04-01',
    user_email: 'user@example.com',
    user_name: 'John Doe',
    status: 'approved',
    entity_type: 'claim',
  };

  const interpolate = (template: string) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleVars[key] ?? `{{${key}}}`);

  return {
    subject: interpolate(subject),
    html: interpolate(htmlBody)
  };
}


// ============================================
// EXTENDED AUDIT LOG (pagination + date range + CSV)
// ============================================

export interface AuditLogPaginatedResult {
  rows: AuditLogEntry[];
  total: number;
}

/**
 * Fetch audit log entries with pagination and date range filters.
 * Returns { rows, total } where total is the full count matching filters.
 */
export async function getRecentAuditLogsPaginated(opts?: {
  action?: string;
  entity_type?: string;
  startDate?: string;  // ISO date string YYYY-MM-DD
  endDate?: string;    // ISO date string YYYY-MM-DD
  offset?: number;
  limit?: number;
}): Promise<AuditLogPaginatedResult> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.action && opts.action !== 'all') {
    query = query.eq('action', opts.action);
  }
  if (opts?.entity_type && opts.entity_type !== 'all') {
    query = query.eq('entity_type', opts.entity_type);
  }
  if (opts?.startDate) {
    query = query.gte('created_at', `${opts.startDate}T00:00:00.000Z`);
  }
  if (opts?.endDate) {
    query = query.lte('created_at', `${opts.endDate}T23:59:59.999Z`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching paginated audit logs:', error);
    return { rows: [], total: 0 };
  }

  return {
    rows: (data || []) as AuditLogEntry[],
    total: count ?? 0
  };
}

/**
 * Download audit log as CSV with the same filters used in the UI.
 * Paginates through all matching rows in chunks of 500.
 */
export async function downloadAuditLogCsv(filters?: {
  action?: string;
  entity_type?: string;
  startDate?: string;
  endDate?: string;
}): Promise<void> {
  const CHUNK_SIZE = 500;
  let allRows: AuditLogEntry[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { rows } = await getRecentAuditLogsPaginated({
      ...filters,
      offset,
      limit: CHUNK_SIZE
    });
    allRows = allRows.concat(rows);
    if (rows.length < CHUNK_SIZE) {
      hasMore = false;
    } else {
      offset += CHUNK_SIZE;
    }
  }

  const headers = [
    'Timestamp',
    'Admin Email',
    'Action',
    'Entity Type',
    'Entity ID',
    'Details'
  ];

  const rows = allRows.map(entry => [
    escapeCsvCell(new Date(entry.created_at).toISOString()),
    escapeCsvCell(entry.admin_email || entry.admin_user_id),
    escapeCsvCell(entry.action),
    escapeCsvCell(entry.entity_type),
    escapeCsvCell(entry.entity_id || ''),
    escapeCsvCell(JSON.stringify(entry.details || {}))
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


// ============================================
// ADMIN USER MANAGEMENT
// ============================================

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Get all user profiles (admin/staff only).
 * Requires the "Staff admin read all profiles" RLS policy.
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all profiles:', error);
    return [];
  }

  return data as UserProfile[];
}

/**
 * Update a user's role (admin only).
 * Requires the "Admin can update any profile" RLS policy.
 */
export async function updateUserRole(userId: string, newRole: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    return false;
  }
  return true;
}


// ============================================
// EMAIL QUOTE PDF
// ============================================

/**
 * Email a quote summary PDF to the user via the email-quote-pdf edge function.
 * The function generates the PDF server-side and sends it as a Resend attachment.
 * @param quoteId - The quote_id string or UUID
 * @param userEmail - The recipient email address
 */
export async function emailQuotePdf(quoteId: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('email-quote-pdf', {
      body: { quote_id: quoteId, user_email: userEmail }
    });

    if (error) {
      console.error('email-quote-pdf error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Failed to send email' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('emailQuotePdf error:', err);
    return { success: false, error: err.message };
  }
}



// ============================================
// ADMIN OVERVIEW — REAL-TIME DASHBOARD
// ============================================

export interface OverviewTodayCounts {
  claimsFiledToday: number;
  coisCompletedToday: number;
  policiesBoundToday: number;
  emailsSentToday: number;
}

export interface SparklineDay {
  date: string;   // YYYY-MM-DD
  label: string;  // e.g. "Mon", "Tue"
  count: number;
}

export interface OverviewSparklines {
  claims: SparklineDay[];
  cois: SparklineDay[];
  policies: SparklineDay[];
}

export interface AdminFeedItem {
  id: string;
  type: 'claim' | 'coi' | 'policy' | 'audit';
  label: string;
  reference: string;
  timestamp: string;
}

/**
 * Helper: get UTC start-of-day ISO string for today
 */
function todayStartUTC(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Helper: get date string N days ago in YYYY-MM-DD
 */
function daysAgoDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/**
 * Fetch today's summary counts for the admin overview.
 */
export async function getOverviewTodayCounts(): Promise<OverviewTodayCounts> {
  const todayStart = todayStartUTC();

  const [claimsRes, coisRes, policiesRes, emailsRes] = await Promise.all([
    // Claims filed today
    supabase
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    // COIs completed today (status=completed, updated_at today)
    supabase
      .from('coi_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', todayStart),
    // Policies bound today
    supabase
      .from('policies')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    // Emails sent today (audit log actions containing 'email' or notification-related)
    supabase
      .from('admin_audit_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .or('action.ilike.%email%,action.ilike.%notification%,action.eq.email_sent')
  ]);

  return {
    claimsFiledToday: claimsRes.count ?? 0,
    coisCompletedToday: coisRes.count ?? 0,
    policiesBoundToday: policiesRes.count ?? 0,
    emailsSentToday: emailsRes.count ?? 0
  };
}

/**
 * Fetch 7-day sparkline data for claims, COIs, and policies.
 * Returns an array of 7 days (including today) with counts per day.
 */
export async function getOverviewSparklineData(): Promise<OverviewSparklines> {
  const sevenDaysAgo = daysAgoDate(6); // 6 days ago + today = 7 days
  const startISO = `${sevenDaysAgo}T00:00:00.000Z`;

  const [claimsRes, coisRes, policiesRes] = await Promise.all([
    supabase
      .from('claims')
      .select('created_at')
      .gte('created_at', startISO)
      .order('created_at', { ascending: true }),
    supabase
      .from('coi_requests')
      .select('created_at, status')
      .gte('created_at', startISO)
      .order('created_at', { ascending: true }),
    supabase
      .from('policies')
      .select('created_at')
      .gte('created_at', startISO)
      .order('created_at', { ascending: true })
  ]);

  // Build 7-day date array
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days: { date: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({ date: dateStr, label: dayLabels[d.getDay()] });
  }

  // Count helper
  const countByDay = (rows: any[], dateField: string = 'created_at'): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const row of rows) {
      const d = new Date(row[dateField]);
      const dateStr = d.toISOString().split('T')[0];
      map[dateStr] = (map[dateStr] || 0) + 1;
    }
    return map;
  };

  const claimCounts = countByDay(claimsRes.data || []);
  const coiCounts = countByDay((coisRes.data || []).filter((r: any) => r.status === 'completed'));
  const policyCounts = countByDay(policiesRes.data || []);

  return {
    claims: days.map(d => ({ ...d, count: claimCounts[d.date] || 0 })),
    cois: days.map(d => ({ ...d, count: coiCounts[d.date] || 0 })),
    policies: days.map(d => ({ ...d, count: policyCounts[d.date] || 0 }))
  };
}

/**
 * Fetch the last 20 admin activity feed items across all entity types.
 * Merges recent claims, COI requests, policies, and audit log entries.
 */
export async function getAdminActivityFeed(limit: number = 20): Promise<AdminFeedItem[]> {
  const [claimsRes, coisRes, policiesRes, auditRes] = await Promise.all([
    supabase
      .from('claims')
      .select('id, claim_number, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('coi_requests')
      .select('id, certificate_holder_name, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('policies')
      .select('id, policy_number, status, business_name, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('admin_audit_log')
      .select('id, action, entity_type, entity_id, admin_email, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  const items: AdminFeedItem[] = [];

  // Claims
  for (const c of (claimsRes.data || [])) {
    const statusLabel = (c.status || 'submitted').replace(/_/g, ' ');
    items.push({
      id: `claim-${c.id}`,
      type: 'claim',
      label: `Claim ${statusLabel}`,
      reference: c.claim_number || c.id.substring(0, 8),
      timestamp: c.updated_at || c.created_at
    });
  }

  // COI requests
  for (const r of (coisRes.data || [])) {
    const statusLabel = (r.status || 'submitted').replace(/_/g, ' ');
    items.push({
      id: `coi-${r.id}`,
      type: 'coi',
      label: `COI status: ${statusLabel}`,
      reference: r.certificate_holder_name || r.id.substring(0, 8),
      timestamp: r.updated_at || r.created_at
    });
  }

  // Policies
  for (const p of (policiesRes.data || [])) {
    items.push({
      id: `policy-${p.id}`,
      type: 'policy',
      label: `Policy ${p.status === 'active' ? 'bound' : p.status}`,
      reference: p.policy_number || p.business_name || p.id.substring(0, 8),
      timestamp: p.updated_at || p.created_at
    });
  }

  // Audit log entries (for email events and other admin actions)
  for (const a of (auditRes.data || [])) {
    const actionLabel = a.action.replace(/_/g, ' ');
    items.push({
      id: `audit-${a.id}`,
      type: 'audit',
      label: actionLabel,
      reference: a.entity_id ? `${a.entity_type}/${a.entity_id.substring(0, 8)}` : (a.admin_email || ''),
      timestamp: a.created_at
    });
  }

  // Sort by timestamp descending, take limit
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, limit);
}



// ============================================
// ADMIN BULK QUOTE EMAIL
// ============================================

/**
 * Get all quotes (admin only) for bulk email feature.
 */
export async function getAllQuotesAdmin(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all quotes:', error);
    return [];
  }

  return data as Quote[];
}


// ============================================
// RENEWAL ALERTS (Admin)
// ============================================

export interface RenewalNotification {
  id: string;
  policy_id: string;
  user_id: string;
  days_before_expiry: number;
  channel: string;
  template_key: string | null;
  status: string;
  resend_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Get policies expiring within the next N days (default 90).
 * Returns policies with status 'active' and expiration_date in range.
 */
export async function getUpcomingRenewals(daysAhead: number = 90): Promise<Policy[]> {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('status', 'active')
    .gte('expiration_date', today)
    .lte('expiration_date', futureDateStr)
    .order('expiration_date', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming renewals:', error);
    return [];
  }

  return data as Policy[];
}

/**
 * Get renewal notifications with optional filters.
 */
export async function getRenewalNotifications(opts?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<RenewalNotification[]> {
  const limit = opts?.limit ?? 100;

  let query = supabase
    .from('renewal_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts?.status && opts.status !== 'all') {
    query = query.eq('status', opts.status);
  }
  if (opts?.startDate) {
    query = query.gte('created_at', `${opts.startDate}T00:00:00.000Z`);
  }
  if (opts?.endDate) {
    query = query.lte('created_at', `${opts.endDate}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching renewal notifications:', error);
    return [];
  }

  return data as RenewalNotification[];
}

/**
 * Trigger the check-renewals edge function manually.
 */
export async function triggerRenewalCheck(): Promise<{ success: boolean; processed?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('check-renewals', {
      body: {}
    });

    if (error) {
      console.error('check-renewals error:', error);
      return { success: false, error: error.message };
    }

    return { success: data?.success === true, processed: data?.processed || 0 };
  } catch (err: any) {
    console.error('triggerRenewalCheck error:', err);
    return { success: false, error: err.message };
  }
}


// ============================================
// FILTERED CLAIMS CSV EXPORT (for Charts tab)
// ============================================

/**
 * Download filtered claims as CSV.
 * Accepts pre-filtered claims array and triggers browser download.
 */
export function downloadFilteredClaimsCsv(claims: Claim[], filename?: string): void {
  const headers = [
    'Claim Number',
    'Segment',
    'Status',
    'Claim Type',
    'Incident Date',
    'Estimated Amount',
    'Settlement Amount',
    'Settlement Date',
    'Description',
    'Created At'
  ];

  const rows = claims.map(c => [
    escapeCsvCell(c.claim_number || 'N/A'),
    escapeCsvCell(c.segment || 'N/A'),
    escapeCsvCell(c.status),
    escapeCsvCell(c.claim_type?.replace(/_/g, ' ') || 'N/A'),
    escapeCsvCell(c.incident_date || 'N/A'),
    escapeCsvCell(formatMoneyCsv(c.estimated_amount)),
    escapeCsvCell(formatMoneyCsv(c.settlement_amount)),
    escapeCsvCell(c.settlement_date || 'N/A'),
    escapeCsvCell(c.description || ''),
    escapeCsvCell(new Date(c.created_at).toLocaleDateString())
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `claims-report-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}



// ============================================
// INBOUND WEBHOOK EVENTS (Admin Audit)
// ============================================

export interface InboundWebhookEvent {
  id: string;
  source: string;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

/**
 * Fetch recent inbound webhook events for the Audit Webhooks sub-section.
 * Staff/admin only (RLS enforced).
 */
export async function getInboundWebhookEvents(opts?: {
  limit?: number;
  offset?: number;
}): Promise<{ rows: InboundWebhookEvent[]; total: number }> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const { data, error, count } = await supabase
    .from('inbound_webhook_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching inbound webhook events:', error);
    return { rows: [], total: 0 };
  }

  return {
    rows: (data || []) as InboundWebhookEvent[],
    total: count ?? 0
  };
}


// ============================================
// ADMIN OVERVIEW PDF EXPORT
// ============================================

/**
 * Download the admin overview dashboard as a PDF report.
 * Invokes the export-admin-overview-pdf edge function which generates
 * the report server-side using pdf-lib and returns base64.
 */
export async function downloadAdminOverviewPdf(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('export-admin-overview-pdf', {
      body: {}
    });

    if (error) {
      console.error('export-admin-overview-pdf error:', error);
      return false;
    }

    if (!data?.base64) {
      console.error('No PDF data returned from export-admin-overview-pdf');
      return false;
    }

    // Decode base64 to binary
    const binaryString = atob(data.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = data.filename || `admin-dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (err) {
    console.error('downloadAdminOverviewPdf error:', err);
    return false;
  }
}


// ============================================
// CRON SCHEDULE STATUS (Admin)
// ============================================

export interface CronScheduleStatus {
  isConfigured: boolean;
  configuredAt: string | null;
  approach: string | null;
  lastRunAt: string | null;
  cronEnabled: boolean;
}

/**
 * Get the full cron schedule status from app_settings.
 * Reads: cron_schedule_configured_at, cron_schedule_approach,
 *        renewal_last_cron_at, renewal_cron_enabled
 */
export async function getCronScheduleStatus(): Promise<CronScheduleStatus> {
  const [configuredAt, approach, lastRun, enabled] = await Promise.all([
    getAppSetting('cron_schedule_configured_at'),
    getAppSetting('cron_schedule_approach'),
    getAppSetting('renewal_last_cron_at'),
    getAppSetting('renewal_cron_enabled')
  ]);

  return {
    isConfigured: configuredAt !== null && configuredAt.length > 0,
    configuredAt,
    approach,
    lastRunAt: lastRun,
    cronEnabled: enabled !== 'false' // default true
  };
}

/**
 * Mark the cron schedule as configured in app_settings.
 * Called after running the migration SQL or setting up via Dashboard.
 */
export async function markCronScheduleConfigured(approach: string): Promise<boolean> {
  const now = new Date().toISOString();
  const [ok1, ok2] = await Promise.all([
    setAppSetting('cron_schedule_configured_at', now),
    setAppSetting('cron_schedule_approach', approach)
  ]);
  return ok1 && ok2;
}



// ============================================
// APP SETTINGS (key/value store for cron toggles etc.)
// ============================================

/**
 * Get a single app setting by key.
 * Returns the value string or null if not found.
 */
export async function getAppSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error || !data) {
    console.error(`Error fetching app_setting "${key}":`, error);
    return null;
  }

  return data.value;
}

/**
 * Set an app setting value. Upserts the row.
 */
export async function setAppSetting(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    console.error(`Error setting app_setting "${key}":`, error);
    return false;
  }

  return true;
}


// ============================================
// UNIFIED WEBHOOK EVENTS (inbound + outbound)
// ============================================

export interface WebhookEvent {
  id: string;
  event_type: string;
  direction: 'inbound' | 'outbound';
  endpoint: string | null;
  source: string | null;
  request_body: Record<string, any> | null;
  response_status: number | null;
  response_body: Record<string, any> | null;
  created_at: string;
}

/**
 * Fetch webhook events from the unified webhook_events table.
 * Supports direction, event_type filters and pagination.
 */
export async function getWebhookEvents(opts?: {
  direction?: string;
  event_type?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: WebhookEvent[]; total: number }> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  let query = supabase
    .from('webhook_events')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.direction && opts.direction !== 'all') {
    query = query.eq('direction', opts.direction);
  }
  if (opts?.event_type && opts.event_type !== 'all') {
    query = query.eq('event_type', opts.event_type);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching webhook events:', error);
    return { rows: [], total: 0 };
  }

  return {
    rows: (data || []) as WebhookEvent[],
    total: count ?? 0
  };
}

/**
 * Retry an outbound webhook event by re-invoking the original edge function.
 * This is a simplified retry: we invoke send-notification with the original request_body.
 * Only works for outbound events with source = 'send-notification'.
 */
export async function retryOutboundWebhook(event: WebhookEvent): Promise<{ success: boolean; error?: string }> {
  if (event.direction !== 'outbound') {
    return { success: false, error: 'Can only retry outbound events' };
  }

  try {
    // Re-invoke the original function based on source
    const body = event.request_body || {};
    let functionName = 'send-notification';

    if (event.source === 'check-renewals') {
      // Cannot easily retry individual renewal emails; trigger full check instead
      functionName = 'check-renewals';
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


// ============================================
// WEBHOOK RULES ENGINE (Admin)
// ============================================

export interface WebhookRule {
  id: string;
  source_match: string | null;
  event_type_match: string;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all webhook rules (admin/staff only).
 */
export async function getWebhookRules(): Promise<WebhookRule[]> {
  const { data, error } = await supabase
    .from('webhook_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching webhook rules:', error);
    return [];
  }

  return data as WebhookRule[];
}

/**
 * Create a new webhook rule.
 */
export async function createWebhookRule(rule: {
  source_match?: string | null;
  event_type_match: string;
  action_type: string;
  action_config: Record<string, any>;
  is_active?: boolean;
  description?: string | null;
}): Promise<WebhookRule | null> {
  const { data, error } = await supabase
    .from('webhook_rules')
    .insert({
      source_match: rule.source_match || null,
      event_type_match: rule.event_type_match,
      action_type: rule.action_type,
      action_config: rule.action_config,
      is_active: rule.is_active ?? true,
      description: rule.description || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating webhook rule:', error);
    return null;
  }

  return data as WebhookRule;
}

/**
 * Update an existing webhook rule.
 */
export async function updateWebhookRule(id: string, updates: Partial<{
  source_match: string | null;
  event_type_match: string;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  description: string | null;
}>): Promise<boolean> {
  const { error } = await supabase
    .from('webhook_rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating webhook rule:', error);
    return false;
  }

  return true;
}

/**
 * Delete a webhook rule.
 */
export async function deleteWebhookRule(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('webhook_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting webhook rule:', error);
    return false;
  }

  return true;
}

/**
 * Toggle a webhook rule's active status.
 */
export async function toggleWebhookRule(id: string, isActive: boolean): Promise<boolean> {
  return updateWebhookRule(id, { is_active: isActive });
}


// ============================================
// ADMIN ALERTS (Overview Banner)
// ============================================

export interface AdminAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  linkTab: string;  // tab name to navigate to
}

/**
 * Fetch critical admin alerts for the overview banner.
 * Checks: expiring policies (7d), stale claims (>48h), failed renewals, failed webhooks.
 */
export async function getAdminAlerts(): Promise<AdminAlert[]> {
  const alerts: AdminAlert[] = [];

  const now = new Date();

  // 1. Policies expiring within 7 days (no recent renewal notification)
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const todayStr = now.toISOString().split('T')[0];
  const sevenDayStr = sevenDaysFromNow.toISOString().split('T')[0];

  const { data: expiringPolicies, error: expErr } = await supabase
    .from('policies')
    .select('id')
    .eq('status', 'active')
    .gte('expiration_date', todayStr)
    .lte('expiration_date', sevenDayStr);

  if (!expErr && expiringPolicies && expiringPolicies.length > 0) {
    alerts.push({
      id: 'expiring-policies-7d',
      severity: 'critical',
      title: 'Policies Expiring Soon',
      description: `${expiringPolicies.length} active policy(ies) expire within 7 days`,
      count: expiringPolicies.length,
      linkTab: 'renewals'
    });
  }

  // 2. Claims in submitted status > 48 hours without update
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const { data: staleClaims, error: claimErr } = await supabase
    .from('claims')
    .select('id')
    .eq('status', 'submitted')
    .lt('updated_at', fortyEightHoursAgo);

  if (!claimErr && staleClaims && staleClaims.length > 0) {
    alerts.push({
      id: 'stale-claims-48h',
      severity: 'warning',
      title: 'Stale Claims',
      description: `${staleClaims.length} claim(s) submitted > 48 hours ago without status change`,
      count: staleClaims.length,
      linkTab: 'claims'
    });
  }

  // 3. Failed renewal notifications (last 7 days)
  const sevenDaysAgoISO = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: failedRenewals, error: renewErr } = await supabase
    .from('renewal_notifications')
    .select('id')
    .eq('status', 'failed')
    .gte('created_at', sevenDaysAgoISO);

  if (!renewErr && failedRenewals && failedRenewals.length > 0) {
    alerts.push({
      id: 'failed-renewals-7d',
      severity: 'warning',
      title: 'Failed Renewal Notifications',
      description: `${failedRenewals.length} renewal email(s) failed in the last 7 days`,
      count: failedRenewals.length,
      linkTab: 'renewals'
    });
  }

  // 4. Failed inbound webhooks (last 7 days)
  const { data: failedWebhooks, error: whErr } = await supabase
    .from('webhook_events')
    .select('id')
    .gte('created_at', sevenDaysAgoISO)
    .gte('response_status', 400);

  if (!whErr && failedWebhooks && failedWebhooks.length > 0) {
    alerts.push({
      id: 'failed-webhooks-7d',
      severity: 'info',
      title: 'Failed Webhook Events',
      description: `${failedWebhooks.length} webhook event(s) with error status in the last 7 days`,
      count: failedWebhooks.length,
      linkTab: 'webhooks'
    });

  }

  return alerts;
}


// ============================================
// RETRY QUEUE (Admin)
// ============================================

export interface RetryQueueItem {
  id: string;
  webhook_event_id: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string;
  status: string;
  last_error: string | null;
  target_function: string;
  payload: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get retry queue items with optional status filter.
 */
export async function getRetryQueueRows(opts?: {
  status?: string;
  limit?: number;
}): Promise<RetryQueueItem[]> {
  const limit = opts?.limit ?? 50;

  let query = supabase
    .from('retry_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts?.status && opts.status !== 'all') {
    query = query.eq('status', opts.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching retry queue:', error);
    return [];
  }

  return data as RetryQueueItem[];
}

/**
 * Manually trigger a retry by setting next_retry_at = now and status = pending.
 */
export async function retryRetryQueueNow(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('retry_queue')
    .update({
      next_retry_at: new Date().toISOString(),
      status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error triggering manual retry:', error);
    return false;
  }
  return true;
}

/**
 * Cancel a pending retry queue item.
 */
export async function cancelRetryQueueItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('retry_queue')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error cancelling retry:', error);
    return false;
  }
  return true;
}

/**
 * Trigger the process-retry-queue edge function manually.
 */
export async function triggerProcessRetryQueue(): Promise<{ success: boolean; processed?: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('process-retry-queue', {
      body: {}
    });

    if (error) {
      console.error('process-retry-queue error:', error);
      return { success: false, error: error.message };
    }

    return { success: data?.success === true, processed: data?.processed || 0 };
  } catch (err: any) {
    console.error('triggerProcessRetryQueue error:', err);
    return { success: false, error: err.message };
  }
}


// ============================================
// CLAIM ASSIGNMENT (Admin)
// ============================================

/**
 * Get staff/admin profiles for claim assignment dropdown.
 */
export async function getStaffProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at, updated_at')
    .in('role', ['staff', 'admin'])
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching staff profiles:', error);
    return [];
  }

  return data as UserProfile[];
}

/**
 * Assign a claim to a staff/admin user.
 */
export async function assignClaim(claimId: string, assigneeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('claims')
    .update({
      assigned_to: assigneeId,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', claimId);

  if (error) {
    console.error('Error assigning claim:', error);
    return false;
  }
  return true;
}

/**
 * Unassign a claim.
 */
export async function unassignClaim(claimId: string): Promise<boolean> {
  const { error } = await supabase
    .from('claims')
    .update({
      assigned_to: null,
      assigned_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', claimId);

  if (error) {
    console.error('Error unassigning claim:', error);
    return false;
  }
  return true;
}

/**
 * Get profile name by ID (for display in claim cards).
 */
export async function getProfileNameById(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data.full_name || data.email || null;
}

/**
 * Get multiple profile names by IDs (batch lookup).
 */
export async function getProfileNamesByIds(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const p of data) {
    map[p.id] = p.full_name || p.email || p.id.substring(0, 8);
  }
  return map;
}


// ============================================
// TEST WEBHOOK (Admin)
// ============================================

/**
 * Send a test webhook to receive-external-webhook edge function.
 */
export async function sendTestWebhook(body: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('receive-external-webhook', {
      body
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
