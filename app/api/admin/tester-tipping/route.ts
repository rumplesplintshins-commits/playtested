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

async function loadPauseState(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.rpc("admin_get_tester_tipping_pause_state");
  if (error || !data?.[0]) throw error ?? new Error("Pause state is unavailable.");
  return data[0];
}

async function listOpenCheckouts(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.rpc("admin_list_open_tester_tip_checkouts");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function reconcileCompletedOrExpiredSession(
  admin: ReturnType<typeof createAdminClient>,
  tipId: string,
  sessionId: string,
  connectedAccountId: string,
  session: Record<string, unknown>,
) {
  if (session.status === "expired") {
    const { error } = await admin.rpc("tester_tip_mark_expired", {
      p_tip_id: tipId, p_session_id: sessionId, p_connected_account_id: connectedAccountId,
    });
    return !error;
  }

  if (session.status === "complete" && session.payment_status === "paid") {
    const paymentIntent = session.payment_intent;
    const paymentIntentId = typeof paymentIntent === "string"
      ? paymentIntent
      : typeof paymentIntent === "object" && paymentIntent !== null &&
          "id" in paymentIntent && typeof paymentIntent.id === "string"
        ? paymentIntent.id
        : null;
    const { error } = await admin.rpc("tester_tip_mark_paid", {
      p_tip_id: tipId,
      p_session_id: sessionId,
      p_payment_intent_id: paymentIntentId,
    });
    return !error;
  }

  return false;
}

export async function GET() {
  const context = await adminContext();
  if ("response" in context) return context.response;

  try {
    const admin = createAdminClient();
    const state = await loadPauseState(admin);
    try {
      const sessions = await listOpenCheckouts(admin);
      return reply(200, { state, openSessions: sessions.length });
    } catch {
      return reply(200, {
        state,
        openSessions: null,
        warning: "Tipping status loaded, but open Checkout Sessions could not be checked. Keep tipping paused until this can be verified.",
      });
    }
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

  let isPaused = false;
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

    // Do not resume while any recorded Checkout Session is still open or its
    // status cannot be verified. Completed payments remain for webhooks to record.
    if (!isPaused) {
      const remaining = await listOpenCheckouts(admin);
      let unresolved = 0;
      for (const target of remaining) {
        const sessionId = typeof target.checkout_session_id === "string" ? target.checkout_session_id : "";
        const connectedAccountId = typeof target.connected_account_id === "string" ? target.connected_account_id : "";
        const tipId = typeof target.tip_id === "string" ? target.tip_id : "";
        if (!sessionId || !connectedAccountId || !tipId) {
          unresolved += 1;
          continue;
        }
        try {
          const session = await stripeV1Get(
            `checkout/sessions/${encodeURIComponent(sessionId)}`,
            connectedAccountId,
          );
          if (session.status === "open" ||
              !await reconcileCompletedOrExpiredSession(admin, tipId, sessionId, connectedAccountId, session)) {
            unresolved += 1;
          }
        } catch {
          unresolved += 1;
        }
      }

      if (unresolved > 0) {
        const state = await loadPauseState(admin);
        return reply(409, {
          state,
          openSessions: unresolved,
          error: `${unresolved} Checkout Session(s) are still open or could not be verified. Tipping remains paused. Retry checkout expiry before resuming.`,
        });
      }
    }

    const { data, error } = await admin.rpc("admin_set_tester_tipping_paused", {
      p_is_paused: isPaused,
      p_actor_id: context.user.id,
    });
    if (error || !data?.[0]) throw error ?? new Error("Pause state could not be saved.");
    const state = data[0];

    if (!isPaused) {
      return reply(200, { state, openSessions: 0, expiry: { attempted: 0, expired: 0, alreadyCompletedOrExpired: 0, failed: 0 } });
    }

    // The database pause is committed first. Every checkout path now rejects new tips.
    // Expire sessions already recorded in the ledger; webhooks remain enabled to reconcile
    // sessions that completed before Stripe accepted the expiry request.
    let targets: Record<string, unknown>[];
    try {
      targets = await listOpenCheckouts(admin);
    } catch {
      return reply(200, {
        state,
        openSessions: null,
        warning: "Tipping is paused, but existing Checkout Sessions could not be enumerated. Keep tipping paused and retry expiry before resuming.",
        expiry: { attempted: 0, expired: 0, alreadyCompletedOrExpired: 0, failed: 0 },
      });
    }

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
        const { error: markError } = await admin.rpc("tester_tip_mark_expired", {
          p_tip_id: tipId, p_session_id: sessionId, p_connected_account_id: connectedAccountId,
        });
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
          if (await reconcileCompletedOrExpiredSession(admin, tipId, sessionId, connectedAccountId, session)) {
            alreadyCompletedOrExpired += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }
    }

    let openSessions: number | null = null;
    try {
      openSessions = (await listOpenCheckouts(admin)).length;
    } catch {
      // The pause remains active if the follow-up check is unavailable.
    }

    return reply(200, {
      state,
      openSessions,
      expiry: { attempted: targets.length, expired, alreadyCompletedOrExpired, failed },
      ...(failed || openSessions === null || openSessions > 0
        ? { warning: "Tipping is paused, but some Checkout Sessions still need verification. The control will retry expiry and will not resume tipping until the remaining sessions are resolved." }
        : {}),
    });
  } catch {
    return reply(503, { error: "The tipping pause could not be saved. Check the current status before trying again." });
  }
}
