import client from "prom-client";

export const jobAcceptAttempts = new client.Counter({
  name: "job_accept_attempts_total",
  help: "Total job accept attempts",
});

export const jobAcceptConflicts = new client.Counter({
  name: "job_accept_conflicts_total",
  help: "Total job accept version conflicts",
});

export const whatsappMessagesSent = new client.Counter({
  name: "whatsapp_messages_sent_total",
  help: "Total WhatsApp messages sent",
});

export const uploadPresignRequests = new client.Counter({
  name: "upload_presign_requests_total",
  help: "Total upload presign requests",
});

export function setupPrometheusMetrics(app: any) {
  app.get("/metrics", async (_req: any, res: any) => {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  });
}
