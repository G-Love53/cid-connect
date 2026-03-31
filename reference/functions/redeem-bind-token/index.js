// Deno Edge Function
Deno.serve(async (req) => {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) {
    return new Response(JSON.stringify({ ok: false, error: "missing_service_config" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(url, serviceRole);

  try {
    const body = await req.json();
    const action = body.action ?? "validate";
    const token = body.token?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!token || !email) {
      return new Response(JSON.stringify({ ok: false, error: "token_and_email_required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const tokenHash = await sha256Hex(token);

    const { data: tokenRow, error: tokenError } = await sb
      .from("policy_bind_tokens")
      .select("id, intended_email, policy_id, quote_id, segment, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!tokenRow) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (tokenRow.used_at) {
      return new Response(JSON.stringify({ ok: false, error: "token_already_used" }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ ok: false, error: "token_expired" }), {
        status: 410,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if ((tokenRow.intended_email || "").toLowerCase() !== email) {
      return new Response(JSON.stringify({ ok: false, error: "email_mismatch" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "validate") {
      return new Response(JSON.stringify({ ok: true, policy_id: tokenRow.policy_id, segment: tokenRow.segment }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userId = body.user_id?.trim();
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "user_id_required_for_redeem" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { error: redeemError } = await sb
      .from("policy_bind_tokens")
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq("id", tokenRow.id)
      .is("used_at", null);

    if (redeemError) throw redeemError;

    if (tokenRow.policy_id) {
      const { data: currentPolicy, error: currentPolicyError } = await sb
        .from("policies")
        .select("id, user_id")
        .eq("id", tokenRow.policy_id)
        .maybeSingle();

      if (currentPolicyError) throw currentPolicyError;
      if (!currentPolicy) {
        return new Response(JSON.stringify({ ok: false, error: "policy_not_found_for_token" }), {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (currentPolicy.user_id && currentPolicy.user_id !== userId) {
        return new Response(JSON.stringify({ ok: false, error: "policy_already_linked_to_another_user" }), {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { error: linkError } = await sb
        .from("policies")
        .update({ user_id: userId })
        .eq("id", tokenRow.policy_id);

      if (linkError) throw linkError;
    }

    return new Response(JSON.stringify({ ok: true, policy_id: tokenRow.policy_id, segment: tokenRow.segment }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
