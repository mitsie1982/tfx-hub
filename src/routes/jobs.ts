  // Digital Contract: Initiate contract (send to both parties)
  router.post('/:id/contract/initiate', async (req, res) => {
    const jobId = req.params.id;
    try {
      // Mock: Compose contract terms from job
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) return res.status(404).json({ error: 'Job not found' });
      // Store contract draft in DB (or memory for mock)
      await prisma.job.update({ where: { id: jobId }, data: { contractStatus: 'pending', contractClientSigned: false, contractContractorSigned: false } });
      // Notify both parties (WhatsApp or browser)
      // ... (integration point)
      return res.json({ ok: true, contract: { jobId, terms: `Job for ${job.title || jobId}` } });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  // Digital Contract: Sign contract (client or contractor)
  router.post('/:id/contract/sign', async (req, res) => {
    const jobId = req.params.id;
    const { role } = req.body; // 'client' or 'contractor'
    try {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) return res.status(404).json({ error: 'Job not found' });
      let update: any = {};
      if (role === 'client') update.contractClientSigned = true;
      else if (role === 'contractor') update.contractContractorSigned = true;
      else return res.status(400).json({ error: 'Invalid role' });
      // If both signed, mark as signed
      if ((role === 'client' && job.contractContractorSigned) || (role === 'contractor' && job.contractClientSigned)) {
        update.contractStatus = 'signed';
      }
      await prisma.job.update({ where: { id: jobId }, data: update });
      return res.json({ ok: true, signedBy: role });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  // Digital Contract: Get contract (with signature status)
  router.get('/:id/contract', async (req, res) => {
    const jobId = req.params.id;
    try {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) return res.status(404).json({ error: 'Job not found' });
      return res.json({
        ok: true,
        contract: {
          jobId,
          status: job.contractStatus || 'pending',
          clientSigned: !!job.contractClientSigned,
          contractorSigned: !!job.contractContractorSigned,
          terms: `Job for ${job.title || jobId}`
        }
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });
import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { notify } from "../notify";

export default function (prisma: PrismaClient) {
  const router = Router();

  // Accept a job (optimistic locking)
  router.post("/:id/accept", async (req, res) => {
    const jobId = req.params.id;
    const { contractorId, version } = req.body;
    if (!contractorId || typeof version !== "number")
      return res.status(400).json({ error: "contractorId and version required" });

    // Optimistic locking via raw SQL to ensure atomic check-and-set
    const result = await prisma.$executeRawUnsafe(
      `
      UPDATE "Job"
      SET "acceptedBy" = $1, "status" = 'accepted', "version" = "version" + 1, "updatedAt" = now()
      WHERE id = $2 AND version = $3 AND status = 'offered'
    `,
      contractorId,
      jobId,
      version,
    );

    if (result === 0) {
      // conflict or invalid state
      const current = await prisma.job.findUnique({ where: { id: jobId } });
      return res
        .status(409)
        .json({ error: "Conflict or already accepted", currentVersion: current?.version, status: current?.status });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    // send notifications
    await notify({
      type: "job.accepted",
      jobId,
      contractorId,
      customerId: job?.customerId || "",
      prisma,
      whatsappService: req.app.locals.whatsappService, // or inject as needed
    });

    return res.json({ ok: true, job });
  });


  // Step 1: Generate payment link for a job
  router.post('/:id/payment-link', async (req, res) => {
    const jobId = req.params.id;
    const { provider, amount, currency, clientId, description } = req.body;
    try {
      const paymentService = require('../services/paymentService');
      const result = await paymentService.generatePaymentLink({ provider, amount, currency, jobId, clientId, description });
      // Optionally, store payment intent in DB
      return res.json({ ok: true, link: result.link });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  // Step 2: Mark payment as escrowed (called by webhook or polling)
  router.post('/:id/escrow', async (req, res) => {
    const jobId = req.params.id;
    const { paymentId, provider } = req.body;
    try {
      const paymentService = require('../services/paymentService');
      await paymentService.markEscrowed({ jobId, paymentId, provider });
      await prisma.job.update({ where: { id: jobId }, data: { status: 'in-escrow' } });
      return res.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  // Step 3: Confirm completion by client
  router.post('/:id/confirm-client', async (req, res) => {
    const jobId = req.params.id;
    try {
      await prisma.job.update({ where: { id: jobId }, data: { clientConfirmed: true } });
      return res.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  // Step 4: Confirm completion by contractor
  router.post('/:id/confirm-contractor', async (req, res) => {
    const jobId = req.params.id;
    try {
      await prisma.job.update({ where: { id: jobId }, data: { contractorConfirmed: true } });
      return res.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  // Step 5: Release escrow if both confirmed
  router.post('/:id/release-escrow', async (req, res) => {
    const jobId = req.params.id;
    const { paymentId, provider } = req.body;
    try {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      // Enterprise: Defensive check for confirmation fields
      if (!('clientConfirmed' in (job || {})) || !('contractorConfirmed' in (job || {})) ||
          !(job && (job as any).clientConfirmed && (job as any).contractorConfirmed)) {
        return res.status(400).json({ error: 'Both parties must confirm completion.' });
      }
      const paymentService = require('../services/paymentService');
      await paymentService.releaseEscrow({ jobId, paymentId, provider });
      await prisma.job.update({ where: { id: jobId }, data: { status: 'paid' } });
      return res.json({ ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
