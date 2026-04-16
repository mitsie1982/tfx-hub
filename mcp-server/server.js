const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

app.get("/health", (req, res) => res.json({ ok: true, service: "mcp-server" }));

// Example endpoint for TFX Hub integration
app.post("/api/tfxhub/ping", (req, res) => {
  res.json({ pong: true, received: req.body });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`MCP server listening on port ${port}`));
