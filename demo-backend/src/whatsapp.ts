import { persistNotificationFailure } from "./server";
let Sentry: any = null;
try {
  Sentry = require("@sentry/node");
} catch {}

export async function sendWhatsAppMessage({ to, message, traceId }: { to: string; message: string; traceId?: string }) {
  try {
    // TODO: Integrate real WhatsApp API
    metrics.whatsappMessagesSent.inc();
    // Simulate send
    console.log(`[WhatsApp] Sent to ${to}: ${message} (traceId=${traceId})`);
    return { ok: true };
  } catch (error) {
    await persistNotificationFailure({
      userId: to,
      type: "whatsapp",
      payload: { message },
      jobId: undefined,
      error,
      traceId,
    });
    if (typeof Sentry?.captureException === "function") Sentry.captureException(error);
    return { ok: false, error };
  }
}
