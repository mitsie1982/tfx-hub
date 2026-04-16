
import bodyParser from "body-parser";
import express from "express";
import matchRouter from "./routes/match";
import profilesRouter from "./routes/profiles";
import uploadsRouter from "./routes/uploads";
import jobsRouterFactory from "./routes/jobs";
const { default: feedbackRouter } = require("./routes/feedback.js");
import { PrismaClient } from "@prisma/client";

const app = express();
app.use(bodyParser.json());

// Prisma instance for jobsRouter
const prisma = new PrismaClient();

// WhatsApp webhook endpoint (must be after app is declared)
const whatsappWebhookRouter = require("./whatsapp/webhook.js");
app.use("/whatsapp", whatsappWebhookRouter);


app.get("/health", (req, res) => res.json({ ok: true, service: "tfx-hub-demo" }));
app.use("/api/profiles", profilesRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/match", matchRouter);
app.use("/api/jobs", jobsRouterFactory(prisma));
app.use("/api/feedback", feedbackRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`TFX Hub demo server listening on port ${port}`));

export default app;
