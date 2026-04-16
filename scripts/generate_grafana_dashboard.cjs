// scripts/generate_grafana_dashboard.js
// Generates a sample Grafana dashboard JSON for Prometheus metrics
const fs = require("fs");
const dashboard = {
  title: "TFX Hub Service Metrics",
  panels: [
    { title: "API Latency", type: "graph", targets: [{ expr: "http_request_duration_seconds" }] },
    { title: "Error Rate", type: "graph", targets: [{ expr: "http_request_errors_total" }] },
    { title: "DB Connections", type: "graph", targets: [{ expr: "db_connections" }] },
  ],
};
fs.writeFileSync("artifacts/grafana_dashboard.json", JSON.stringify(dashboard, null, 2));
console.log("Dashboard JSON generated at artifacts/grafana_dashboard.json");
