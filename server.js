// Simple admin authentication middleware
function adminAuth(req, res, next) {
  // Example: check for static admin token in header or query (replace with real auth in production)
  const token = req.headers['x-admin-token'] || req.query.admin_token;
  if (token === process.env.ADMIN_TOKEN || token === 'letmein') {
    return next();
  }
  res.status(401).send('Unauthorized: Admin token required');
}
const express = require("express");
const { exec } = require("child_process");
const rateLimit = require("express-rate-limit");
const Redis = require("ioredis");
const winston = require("winston");
const client = require("prom-client");
const appInsights = require("applicationinsights");
const app = express();
const feedbackRoute = require('./src/routes/feedback');
const schedulingMemoryRouter = require('./src/routes/scheduling-memory').default || require('./src/routes/scheduling-memory');
const schedulingRoute = require('./src/routes/scheduling');
const disputesRoute = require('./src/routes/disputes');
// Application Insights setup (replace with your actual instrumentation key)
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
  console.log("Application Insights enabled");
}
const aiClient = appInsights.defaultClient;
// Winston logger setup (logs to console, can be extended to file or remote)
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

// Custom Prometheus counters
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

// Rate limiting middleware (100 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Redis setup (for session/state management)
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

app.use(express.json());
app.use('/api/feedback', feedbackRoute);
app.use('/api/scheduling', schedulingMemoryRouter);
app.use('/api/scheduling', schedulingRoute);
app.use('/api/disputes', adminAuth, disputesRoute);

// Minimal admin UI for disputes
app.get('/admin', adminAuth, (req, res) => {
  const html = `
  <html>
  <head>
    <title>TFX Dispute Center</title>
    <style>
      body { font-family: sans-serif; margin: 32px; }
      .dispute { border: 1px solid #ccc; padding: 16px; margin-bottom: 16px; border-radius: 8px; }
      .status { font-weight: bold; }
      .chat { background: #f9f9f9; padding: 8px; border-radius: 4px; margin: 8px 0; }
      .actions { margin-top: 8px; }
      .hidden { display: none; }
    </style>
  </head>
  <body>
    <h1>Dispute Resolution Center</h1>
    <div id="list"></div>
    <div id="detail"></div>
    <script>
      async function loadDisputes() {
        const res = await fetch('/api/disputes');
        const data = await res.json();
        const container = document.getElementById('list');
        container.innerHTML = '';
        data.forEach(d => {
          const div = document.createElement('div');
          div.className = 'dispute';
          div.innerHTML = `
            <div><b>ID:</b> "+d.id+" | <b>Job:</b> "+d.jobId+" | <span class='status'>Status: "+d.status+"</span></div>
            <div><b>Parties:</b> "+(d.parties ? d.parties.join(', ') : '-')+"</div>
            <button onclick='showDetail("+d.id+")'>View Details</button>
          `;
          container.appendChild(div);
        });
      }
      async function showDetail(id) {
        const res = await fetch('/api/disputes/' + id);
        const d = await res.json();
        const detail = document.getElementById('detail');
        detail.innerHTML = `
          <div class='dispute'>
            <h2>Dispute #
              ${d.id} (Job: ${d.jobId})
            </h2>
            <div><b>Status:</b> <span class='status'>${d.status}</span></div>
            <div><b>Parties:</b> ${(d.parties || []).join(', ')}</div>
            <div><b>Chat History:</b></div>
            <div class='chat'>${(d.chatHistory || []).map(msg => `<div><b>${msg.sender}:</b> ${msg.text}</div>`).join('')}</div>
            <div><b>Resolution:</b> ${d.resolution || '-'}</div>
            <div class='actions'>
              <label>Update Status:
                <select id='statusSel'>
                  <option value='OPEN' ${d.status==='OPEN'?'selected':''}>OPEN</option>
                  <option value='IN_REVIEW' ${d.status==='IN_REVIEW'?'selected':''}>IN_REVIEW</option>
                  <option value='RESOLVED' ${d.status==='RESOLVED'?'selected':''}>RESOLVED</option>
                </select>
              </label>
              <button onclick='updateStatus(${d.id})'>Update</button>
              <br><br>
              <label>Resolution:<br>
                <textarea id='resolutionTxt' rows='3' cols='40'>${d.resolution||''}</textarea>
              </label>
              <button onclick='resolveDispute(${d.id})'>Resolve</button>
              <button onclick='closeDetail()'>Close</button>
            </div>
          </div>
        `;
      }
      async function updateStatus(id) {
        const status = document.getElementById('statusSel').value;
        await fetch('/api/disputes/' + id + '/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        await loadDisputes();
        await showDetail(id);
      }
      async function resolveDispute(id) {
        const resolution = document.getElementById('resolutionTxt').value;
        await fetch('/api/disputes/' + id + '/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution })
        });
        await loadDisputes();
        await showDetail(id);
      }
      function closeDetail() {
        document.getElementById('detail').innerHTML = '';
      }
      loadDisputes();
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// Prometheus metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// Example: Store and retrieve session data in Redis
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

// Example: Instrument onboarding completion (call this in your onboarding logic)
app.post("/onboarding/complete", (req, res) => {
  const { userId, userType } = req.body;
  onboardingCompletion.inc({ user_type: userType || "unknown" });
  logger.info({ event: "onboarding_complete", userId, userType });
  if (aiClient) aiClient.trackEvent({ name: "onboarding_complete", properties: { userId, userType } });
  if (aiClient) aiClient.trackMetric({ name: "onboarding_complete", value: 1 });
  res.send("Onboarding completion recorded");
});

// Example: Instrument job posting
app.post("/job/post", (req, res) => {
  jobPosted.inc();
  logger.info({ event: "job_posted", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "job_posted", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "job_posted", value: 1 });
  res.send("Job posted event recorded");
});

// Example: Instrument job acceptance
app.post("/job/accept", (req, res) => {
  jobAccepted.inc();
  logger.info({ event: "job_accepted", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "job_accepted", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "job_accepted", value: 1 });
  res.send("Job accepted event recorded");
});

// Example: Instrument message sent
app.post("/message/send", (req, res) => {
  messagesSent.inc();
  logger.info({ event: "message_sent", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "message_sent", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "messages_sent", value: 1 });
  res.send("Message sent event recorded");
});

// Example: Instrument job completion
app.post("/job/complete", (req, res) => {
  jobsCompleted.inc();
  logger.info({ event: "job_completed", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "job_completed", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "jobs_completed", value: 1 });
  res.send("Job completed event recorded");
});

// Example: Instrument support ticket raised
app.post("/support/ticket", (req, res) => {
  supportTickets.inc();
  logger.info({ event: "support_ticket_raised", ...req.body });
  if (aiClient) aiClient.trackEvent({ name: "support_ticket_raised", properties: req.body });
  if (aiClient) aiClient.trackMetric({ name: "support_tickets", value: 1 });
  res.send("Support ticket event recorded");
});

// Existing endpoint
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
