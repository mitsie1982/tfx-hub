const express = require("express");
const { exec } = require("child_process");
const rateLimit = require("express-rate-limit");
const Redis = require("ioredis");
const winston = require("winston");
const client = require("prom-client");
const appInsights = require("applicationinsights");
const app = express();
// const feedbackRoute = require('./src/routes/feedback.cjs');
const schedulingMemoryRouter = require('./src/routes/scheduling-memory.cjs');

if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
  console.log("Application Insights enabled");
}
const aiClient = appInsights.defaultClient;
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();
const onboardingCompletion = new client.Counter({
  name: "onboarding_completion_total",
  help: "Total onboarding completions",
  labelNames: ["user_type"],
});
const jobPosted = new client.Counter({
  name: "job_posted_total",
  help: "Total jobs posted",
});
const jobAccepted = new client.Counter({
  name: "job_accepted_total",
  help: "Total jobs accepted",
});
const messagesSent = new client.Counter({
  name: "messages_sent_total",
  help: "Total messages sent",
});
const jobsCompleted = new client.Counter({
  name: "jobs_completed_total",
  help: "Total jobs completed",
});
const supportTickets = new client.Counter({
  name: "support_tickets_total",
  help: "Total support tickets raised",
});
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
});
app.use(limiter);
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
app.use(express.json());
// app.use('/api/feedback', feedbackRoute);
app.use('/api/scheduling', schedulingMemoryRouter);
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
app.post("/session", async (req, res) => {
  const { userId, sessionData, userType } = req.body;
  if (!userId || !sessionData) return res.status(400).send("Missing userId or sessionData");
  await redis.set(`session:${userId}`, JSON.stringify(sessionData));
  logger.info({ event: "session_stored", userId, userType });
  if (aiClient) aiClient.trackEvent({ name: "session_stored", properties: { userId, userType } });
  res.send("Session stored");
});
app.get("/session/:userId", async (req, res) => {
  const { userId } = req.params;
  const data = await redis.get(`session:${userId}`);
  if (!data) return res.status(404).send("Session not found");
  logger.info({ event: "session_retrieved", userId });
  if (aiClient) aiClient.trackEvent({ name: "session_retrieved", properties: { userId } });
  res.json(JSON.parse(data));
});
app.post("/onboarding/complete", (req, res) => {
  const { userId, userType } = req.body;
  onboardingCompletion.inc({ user_type: userType || "unknown" });
  logger.info({ event: "onboarding_complete", userId, userType });
  if (aiClient) aiClient.trackEvent({ name: "onboarding_complete", properties: { userId, userType } });
  if (aiClient) aiClient.trackMetric({ name: "onboarding_complete", value: 1 });
  res.send("Onboarding completion recorded");
});
app.post("/job/post", (req, res) => {
  jobPosted.inc();
  logger.info({ event: "job_posted", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "job_posted", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "job_posted", value: 1 });
  res.send("Job posted event recorded");
});
app.post("/job/accept", (req, res) => {
  jobAccepted.inc();
  logger.info({ event: "job_accepted", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "job_accepted", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "job_accepted", value: 1 });
  res.send("Job accepted event recorded");
});
app.post("/message/send", (req, res) => {
  messagesSent.inc();
  logger.info({ event: "message_sent", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "message_sent", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "messages_sent", value: 1 });
  res.send("Message sent event recorded");
});
app.post("/job/complete", (req, res) => {
  jobsCompleted.inc();
  logger.info({ event: "job_completed", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "job_completed", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "jobs_completed", value: 1 });
  res.send("Job completed event recorded");
});
app.post("/support/ticket", (req, res) => {
  supportTickets.inc();
  logger.info({ event: "support_ticket_raised", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "support_ticket_raised", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "support_tickets", value: 1 });
  res.send("Support ticket event recorded");
});
app.post("/run", (req, res) => {
  const mode = req.body.command;
  exec(
    `powershell -ExecutionPolicy Bypass -File scripts/tfx_control_panel.ps1 -Mode ${mode}`,
    (err, stdout, stderr) => {
      if (err) return res.send(stderr);
      res.send(stdout);
    },
  );
});
app.listen(4000, () => console.log("TFX Control Server running on port 4000"));
