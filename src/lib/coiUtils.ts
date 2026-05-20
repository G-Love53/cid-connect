import type { COIRequest } from '@/types';

export type CertificateHolder = {
  key: string;
  holderName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  certificateType: string;
  lastUsedAt: string;
  requestCount: number;
};

export const COI_STATUS_STEPS = [
  { key: 'submitted', label: 'Received' },
  { key: 'processing', label: 'Generating' },
  { key: 'completed', label: 'Sent' },
] as const;

export function formatCoiStatus(status: COIRequest['status']): string {
  const map: Record<string, string> = {
    submitted: 'Received',
    processing: 'Generating',
    completed: 'Sent',
    failed: 'Needs attention',
  };
  return map[status] || status;
}

export function formatCertificateType(value?: string | null): string {
  if (!value || value === 'standard') return 'Standard proof of insurance';
  return value.replace(/_/g, ' ');
}

export function getCoiDownloadUrl(request: COIRequest): string | null {
  return request.generated_pdf_url || request.pdf_url || null;
}

export function isCoiInProgress(status: COIRequest['status']): boolean {
  return status === 'submitted' || status === 'processing';
}

export function holderKeyFromRequest(request: COIRequest): string {
  return [
    request.certificate_holder_name?.trim().toLowerCase(),
    request.delivery_email?.trim().toLowerCase(),
    request.certificate_holder_address?.trim().toLowerCase(),
  ].join('|');
}

export function extractCertificateHolders(requests: COIRequest[]): CertificateHolder[] {
  const map = new Map<string, CertificateHolder>();

  for (const request of requests) {
    const key = holderKeyFromRequest(request);
    if (!request.certificate_holder_name?.trim()) continue;

    const existing = map.get(key);
    const entry: CertificateHolder = {
      key,
      holderName: request.certificate_holder_name,
      address: request.certificate_holder_address || '',
      city: request.certificate_holder_city || '',
      state: request.certificate_holder_state || '',
      zip: request.certificate_holder_zip || '',
      email: request.delivery_email || '',
      certificateType: request.certificate_type || 'standard',
      lastUsedAt: request.created_at,
      requestCount: 1,
    };

    if (!existing) {
      map.set(key, entry);
      continue;
    }

    existing.requestCount += 1;
    if (new Date(request.created_at).getTime() > new Date(existing.lastUsedAt).getTime()) {
      existing.lastUsedAt = request.created_at;
      existing.certificateType = request.certificate_type || existing.certificateType;
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
  );
}

export function holderToPrefill(holder: CertificateHolder) {
  return {
    holderName: holder.holderName,
    address: holder.address,
    city: holder.city,
    state: holder.state,
    zip: holder.zip,
    email: holder.email,
    certificateType: holder.certificateType,
  };
}

export function requestToPrefill(request: COIRequest) {
  return {
    holderName: request.certificate_holder_name,
    address: request.certificate_holder_address || '',
    city: request.certificate_holder_city || '',
    state: request.certificate_holder_state || '',
    zip: request.certificate_holder_zip || '',
    email: request.delivery_email,
    certificateType: request.certificate_type || 'standard',
  };
}

export function formatCoiTimelineDescription(request: COIRequest): string {
  const parts = [
    `Holder: ${request.certificate_holder_name || 'Unknown'}`,
    `Sent to: ${request.delivery_email || '—'}`,
    `Type: ${formatCertificateType(request.certificate_type)}`,
    `Status: ${formatCoiStatus(request.status)}`,
  ];
  if (request.updated_at && request.status === 'completed') {
    parts.push(`Completed: ${new Date(request.updated_at).toLocaleString()}`);
  }
  return parts.join(' · ');
}
