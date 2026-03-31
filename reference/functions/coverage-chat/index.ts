// Canonical source reference for Famous Edge Function (v2.0)
// Browser -> Famous coverage-chat -> Render /api/coverage-chat/inference
// Secrets required in Famous: CID_API_BASE_URL, CID_INTERNAL_API_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const started = Date.now();
  const base = Deno.env.get("CID_API_BASE_URL");
  const internalKey = Deno.env.get("CID_INTERNAL_API_KEY");

  const respond = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (!base || !internalKey) {
    return respond(500, {
      success: false,
      message: "Coverage inference unavailable",
      model_used: "none",
      fallback_used: false,
      fallback_reason: "missing_render_config",
      latency_ms: Date.now() - started,
    });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${base.replace(/\/$/, "")}/api/coverage-chat/inference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${internalKey}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await res.json();

    // fire-and-forget audit
    try {
      const url = Deno.env.get("SUPABASE_URL") ?? "";
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (url && key) {
        const sb = createClient(url, key);
        await sb.from("chat_model_audit_log").insert({
          user_id: body?.userId ?? null,
          model_used: payload?.model_used ?? "unknown",
          fallback_used: Boolean(payload?.fallback_used),
          fallback_reason: payload?.fallback_reason ?? null,
          latency_ms: payload?.latency_ms ?? Date.now() - started,
        });
      }
    } catch (_) {
      // no-op
    }

    return respond(res.status, {
      success: Boolean(payload?.success),
      message: payload?.message ?? "",
      model_used: payload?.model_used ?? "unknown",
      fallback_used: Boolean(payload?.fallback_used),
      fallback_reason: payload?.fallback_reason ?? null,
      latency_ms: payload?.latency_ms ?? Date.now() - started,
    });
  } catch (err) {
    return respond(500, {
      success: false,
      message: "Coverage inference failed",
      model_used: "none",
      fallback_used: false,
      fallback_reason: (err as Error).message,
      latency_ms: Date.now() - started,
    });
  }
});
