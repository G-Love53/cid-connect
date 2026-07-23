import type { Policy } from "@/types";

const ACTIVE = new Set(["active"]);
const BOUND_LIKE = new Set(["bound", "signed", "issued"]);

/** Pick the policy the insured is viewing (stored preference → newest active). */
export function resolveDefaultPolicy(
  policies: Policy[],
  preferredId?: string | null,
): Policy | null {
  if (!policies.length) return null;

  if (preferredId) {
    const hit = policies.find((p) => p.id === preferredId);
    if (hit) return hit;
  }

  const normalized = [...policies]
    .filter((p) => p?.created_at)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  const active = normalized.filter((p) =>
    ACTIVE.has(String(p.status || "").toLowerCase()),
  );
  if (active.length) return active[0];

  const boundLike = normalized.filter((p) =>
    BOUND_LIKE.has(String(p.status || "").toLowerCase()),
  );
  if (boundLike.length) return boundLike[0];

  return normalized[0] ?? policies[0] ?? null;
}

export function formatPolicyOptionLabel(policy: Policy): string {
  const segment = String(policy.segment || "policy")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const name = policy.business_name?.trim();
  const num = policy.policy_number || policy.id.slice(0, 8);
  if (name) return `${segment} — ${name}`;
  return `${segment} — ${num}`;
}
