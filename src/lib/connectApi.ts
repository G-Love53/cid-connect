/**
 * CID-PDF-API /api/connect — insurance data (cid-postgres) via session headers.
 * Enable with VITE_CID_API_URL (e.g. https://cid-pdf-api.onrender.com).
 */
import type { Policy, Quote, Claim, COIRequest, Document } from "@/types";
import { supabase } from "@/lib/supabase";

function baseUrl(): string {
  return (import.meta.env.VITE_CID_API_URL as string | undefined)?.replace(/\/$/, "") || "";
}

export function isConnectInsuranceApiEnabled(): boolean {
  return Boolean(baseUrl().trim());
}

export type ConnectJsonResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  count?: number;
  message?: string;
};

/**
 * Authenticated fetch to /api/connect. Requires signed-in user with email.
 */
export async function connectFetch(
  path: string,
  init?: RequestInit,
): Promise<{ res: Response; json: ConnectJsonResult<unknown> }> {
  const base = baseUrl();
  if (!base) {
    throw new Error("VITE_CID_API_URL is not set");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.email) {
    throw new Error("Not signed in");
  }

  const url = `${base}/api/connect${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set("X-User-Email", session.user.email);
  if (session.user.id) {
    headers.set("X-User-Id", session.user.id);
  }
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });
  const json = (await res.json().catch(() => ({}))) as ConnectJsonResult<unknown>;
  return { res, json };
}

export async function connectGet<T>(path: string): Promise<ConnectJsonResult<T>> {
  const { res, json } = await connectFetch(path, { method: "GET" });
  if (!res.ok) {
    return {
      ok: false,
      error: (json as { error?: string }).error || res.statusText || "Request failed",
    };
  }
  return json as ConnectJsonResult<T>;
}

export async function connectPost<T>(path: string, body: unknown): Promise<ConnectJsonResult<T>> {
  const { res, json } = await connectFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return {
      ok: false,
      error: (json as { error?: string }).error || res.statusText || "Request failed",
    };
  }
  return json as ConnectJsonResult<T>;
}

// --- Map cid-postgres /api/connect payloads → Connect `src/types` shapes ---

export function mapConnectPolicyRow(row: Record<string, unknown>, userId: string): Policy {
  return {
    id: String(row.id),
    user_id: (row.user_id as string) || userId,
    policy_number: String(row.policy_number ?? ""),
    segment: String(row.segment ?? ""),
    business_name: String(row.business_name ?? ""),
    carrier: String(row.carrier ?? ""),
    carrier_id: (row.carrier_id as string | null) ?? null,
    effective_date: String(row.effective_date ?? ""),
    expiration_date: String(row.expiration_date ?? ""),
    premium: row.premium != null ? Number(row.premium) : 0,
    status: String(row.status ?? ""),
    general_liability_limit: (row.general_liability_limit as string | null) ?? null,
    property_limit: (row.property_limit as string | null) ?? null,
    auto_limit: (row.auto_limit as string | null) ?? null,
    workers_comp_limit: (row.workers_comp_limit as string | null) ?? null,
    umbrella_limit: (row.umbrella_limit as string | null) ?? null,
    deductible: row.deductible != null ? Number(row.deductible) : null,
    payment_frequency: (row.payment_frequency as string | null) ?? null,
    next_payment_date: (row.next_payment_date as string | null) ?? null,
    next_payment_amount: row.next_payment_amount != null ? Number(row.next_payment_amount) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function mapConnectQuoteRow(row: Record<string, unknown>, userId: string): Quote {
  const rj = row.reviewed_json ?? row.ai_summary;
  const application_details =
    typeof rj === "string" ? rj : rj != null ? JSON.stringify(rj) : "{}";
  const qid = row.quote_id ?? row.id;
  return {
    id: String(qid),
    user_id: userId,
    quote_id: String(qid),
    segment: String(row.segment ?? ""),
    business_name: undefined,
    carrier: row.carrier_name != null ? String(row.carrier_name) : undefined,
    application_details,
    premium: row.annual_premium != null ? Number(row.annual_premium) : null,
    coverage_summary: null,
    ai_summary: rj,
    eligibility: "Approved",
    status: String(row.status ?? "pending"),
    bound_at: null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function parsePhotos(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function mapConnectClaimRow(row: Record<string, unknown>, userId: string): Claim {
  return {
    id: String(row.id),
    user_id: userId,
    policy_id: String(row.policy_id),
    claim_number: row.claim_number != null ? String(row.claim_number) : null,
    segment: row.segment != null ? String(row.segment) : null,
    incident_date: row.incident_date != null ? String(row.incident_date) : "",
    incident_time: (row.incident_time as string | null) ?? null,
    incident_location: String(row.incident_location ?? ""),
    description: String(row.description ?? ""),
    claim_type: row.claim_type != null ? String(row.claim_type) : null,
    estimated_amount: row.estimated_amount != null ? Number(row.estimated_amount) : null,
    settlement_amount: row.settlement_amount != null ? Number(row.settlement_amount) : null,
    settlement_date: row.settlement_date != null ? String(row.settlement_date) : null,
    third_party_name: (row.third_party_name as string | null) ?? null,
    third_party_contact: (row.third_party_contact as string | null) ?? null,
    third_party_insurance: null,
    photos: parsePhotos(row.photos),
    status: String(row.status ?? ""),
    adjuster_name: (row.adjuster_name as string | null) ?? null,
    adjuster_phone: (row.adjuster_phone as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    assigned_to: (row.assigned_to as string | null) ?? null,
    assigned_at: (row.assigned_at as string | null) ?? null,
    backend_notified: Boolean(row.backend_notified),
    backend_response: row.backend_response ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function mapConnectCoiRow(row: Record<string, unknown>, userId: string): COIRequest {
  return {
    id: String(row.id),
    user_id: userId,
    policy_id: row.policy_id != null ? String(row.policy_id) : null,
    request_number: String(row.request_number ?? ""),
    certificate_holder_name: String(row.certificate_holder_name ?? ""),
    certificate_holder_address: (row.certificate_holder_address as string | null) ?? null,
    certificate_holder_city: (row.certificate_holder_city as string | null) ?? null,
    certificate_holder_state: (row.certificate_holder_state as string | null) ?? null,
    certificate_holder_zip: (row.certificate_holder_zip as string | null) ?? null,
    delivery_email: String(row.delivery_email ?? ""),
    certificate_type: String(row.certificate_type ?? "standard"),
    additional_instructions: (row.additional_instructions as string | null) ?? null,
    uploaded_file_path: (row.uploaded_file_path as string | null) ?? null,
    uploaded_file_name: (row.uploaded_file_name as string | null) ?? null,
    status: (row.status as COIRequest["status"]) || "submitted",
    pdf_url: (row.pdf_url as string | null) ?? null,
    generated_pdf_url: (row.generated_pdf_url as string | null) ?? null,
    segment: row.segment != null ? String(row.segment) : null,
    backend_notified: Boolean(row.backend_notified),
    backend_response: row.backend_response ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function mapConnectDocumentRow(row: Record<string, unknown>, userId: string): Document {
  return {
    id: String(row.document_id ?? row.id),
    user_id: userId,
    policy_id: row.policy_id != null ? String(row.policy_id) : null,
    name: String(row.document_type ?? row.document_role ?? "Document"),
    type: String(row.document_type ?? "other"),
    description: null,
    file_path: String(row.storage_path ?? ""),
    file_size: null,
    mime_type: (row.mime_type as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}
