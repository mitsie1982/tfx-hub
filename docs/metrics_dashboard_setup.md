# Metrics Dashboard & Alert Setup Guide

## Grafana + Prometheus

### 1. Add Prometheus as a Data Source

- In Grafana, go to **Settings > Data Sources**.
- Click **Add data source**, select **Prometheus**.
- Set URL: `http://<your-server>:4000/metrics` (replace `<your-server>` with your host).
- Click **Save & Test**.

### 2. Create Dashboard & Panels

- Click **+ > Dashboard > Add new panel**.
- Use these PromQL queries for panels:
  - **Onboarding completions:** `sum(onboarding_completion_total) by (user_type)`
  - **Jobs posted:** `increase(job_posted_total[1h])`
  - **Jobs accepted:** `increase(job_accepted_total[1h])`
  - **Messages sent:** `increase(messages_sent_total[1h])`
  - **Jobs completed:** `increase(jobs_completed_total[1h])`
  - **Support tickets:** `increase(support_tickets_total[1h])`
- Set panel titles and visualization types.
- Click **Apply** for each panel.

### 3. Set Up Alerts

- In each panel, go to the **Alert** tab.
- Click **Create alert rule**.
- Set conditions (e.g., onboarding completions drop below threshold).
- Add notification channels in **Alerting > Contact points**.
- Save the alert rule.

### 4. Monitor

- Use the dashboard for real-time monitoring and alerting.

---

## Azure Monitor (Containerized Node.js Example)

### 1. Add Application Insights SDK

- Install: `npm install applicationinsights`
- In your entrypoint (e.g., `server.js`):
  ```js
  const appInsights = require("applicationinsights");
  appInsights.setup("<INSTRUMENTATION_KEY>").start();
  ```

### 2. Track Custom Events

- Example:
  ```js
  const client = appInsights.defaultClient;
  client.trackEvent({ name: "onboarding_complete", properties: { userId, userType } });
  client.trackMetric({ name: "jobs_posted", value: 1 });
  ```
- Add similar calls in your onboarding, job, and support endpoints.

### 3. View Metrics & Create Alerts

- Go to **Azure Portal > Application Insights > Metrics**.
- Add charts for custom events/metrics.
- Set up **Alerts** for thresholds (e.g., sudden drop in onboarding, spike in support tickets).
- Configure action groups for notifications (email, SMS, Teams, etc.).

### 4. Dashboard

- Pin charts to an Azure Dashboard for unified monitoring.

---

For more details, see the official docs:

- [Grafana](https://grafana.com/docs/grafana/latest/getting-started/build-dashboards/)
- [Prometheus](https://prometheus.io/docs/visualization/grafana/)
- [Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/)
- [Application Insights Node.js](https://learn.microsoft.com/en-us/azure/azure-monitor/app/nodejs)
