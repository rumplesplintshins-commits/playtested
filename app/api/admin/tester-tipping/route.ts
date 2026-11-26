import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin-server";
import { createAdminClient, stripePostForm, stripeV1Get } from "@/lib/tester-tips/server";
import { hasTrustedOrigin } from "@/lib/request-origin";

const headers = { "Cache-Control": "private, no-store" };
const reply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers });

async function adminContext() {
  const { status } = await requireAdmin();
  if (status !== 200) return { response: reply(status, { error: "Administrator access required." }) };

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: reply(401, { error: "Please sign in again." }) };

  return { user };
}

export async function GET() {
  const context = await adminContext();
  if ("response" in context) return context.response;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("admin_get_tester_tipping_pause_state");
    if (error || !data?.[0]) throw error ?? new Error("Pause state is unavailable.");
    return reply(200, { state: data[0] });
  } catch {
    return reply(503, { error: "Tipping status could not be loaded." });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return reply(403, { error: "Request origin could not be verified." });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reply(415, { error: "Expected JSON." });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 128) {
    return reply(413, { error: "Request too large." });
  }

  let isPaused: boolean | null = null;
  try {
    const raw = await request.text();
    if (raw.length > 128) return reply(413, { error: "Request too large." });
    const body: unknown = JSON.parse(raw);
    if (typeof body !== "object" || body === null || !("paused" in body) || typeof body.paused !== "boolean") {
      return reply(400, { error: "A boolean pause state is required." });
    }
    isPaused = body.paused;
  } catch {
    return reply(400, { error: "Invalid request." });
  }

  const context = await adminContext();
  if ("response" in context) return context.response;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("admin_set_tester_tipping_paused", {
      p_is_paused: isPaused,
      p_actor_id: context.user.id,
    });
    if (error || !data?.[0]) throw error ?? new Error("Pause state could not be saved.");
    const state = data[0];

    if (!isPaused) {
      return reply(200, { state, expiry: { attempted: 0, expired: 0, alreadyCompletedOrExpired: 0, failed: 0 } });
    }

    // The database pause is committed first. Every checkout path now rejects new tips.
    // Expire sessions already recorded in the ledger; webhooks remain enabled to reconcile
    // sessions that completed before Stripe accepted the expiry request.
    const { data: sessions, error: sessionsError } = await admin.rpc("admin_list_open_tester_tip_checkouts");
    if (sessionsError) {
      return reply(200, {
        state,
        warning: "Tipping is paused, but existing checkout sessions could not be enumerated. Review Stripe Connect sessions before resuming.",
        expiry: { attempted: 0, expired: 0, alreadyCompletedOrExpired: 0, failed: 0 },
      });
    }

    const targets = Array.isArray(sessions) ? sessions : [];
    let expired = 0;
    let alreadyCompletedOrExpired = 0;
    let failed = 0;

    for (const target of targets) {
      const tipId = typeof target.tip_id === "string" ? target.tip_id : "";
      const sessionId = typeof target.checkout_session_id === "string" ? target.checkout_session_id : "";
      const connectedAccountId = typeof target.connected_account_id === "string" ? target.connected_account_id : "";
      if (!tipId || !sessionId || !connectedAccountId) {
        failed += 1;
        continue;
      }

      try {
        await stripePostForm(
          `checkout/sessions/${encodeURIComponent(sessionId)}/expire`,
          {},
          `playtested-tip-emergency-expire-${sessionId}`,
          connectedAccountId,
        );
        const { error: markError } = await admin.rpc("tester_tip_mark_expired", { p_tip_id: tipId });
        if (markError) failed += 1;
        else expired += 1;
      } catch {
        // Stripe may report that the Checkout Session has already completed or expired.
        // Retrieve it so completed payments remain available to the normal webhook flow.
        try {
          const session = await stripeV1Get(
            `checkout/sessions/${encodeURIComponent(sessionId)}`,
            connectedAccountId,
          );
          if (session.status === "complete" || session.status === "expired") {
            alreadyCompletedOrExpired += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }
    }

    return reply(200, {
      state,
      expiry: { attempted: targets.length, expired, alreadyCompletedOrExpired, failed },
      ...(failed ? { warning: `${failed} existing checkout session(s) could not be confirmed expired. Tipping remains paused; review these sessions in Stripe before resuming.` } : {}),
    });
  } catch {
    return reply(503, { error: "The tipping pause could not be saved. Tipping status has not been changed." });
  }
}
