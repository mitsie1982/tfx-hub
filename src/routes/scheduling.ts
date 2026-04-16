import { PrismaClient } from "@prisma/client";
import { Router } from "express";

export default function (prisma: PrismaClient) {
  const router = Router();

  // Contractor sets availability slots
  router.post("/contractors/:id/availability", async (req, res) => {
    const contractorId = req.params.id;
    const { slots } = req.body as { slots: { start: string; end: string }[] };
    try {
      const created = await Promise.all(
        slots.map((slot: { start: string; end: string }) =>
          prisma.availability.create({
            data: { contractorId, start: new Date(slot.start), end: new Date(slot.end) }
          })
        )
      );
      res.json({ ok: true, slots: created });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  // List contractor availability
  router.get("/contractors/:id/availability", async (req, res) => {
    const contractorId = req.params.id;
    const slots = await prisma.availability.findMany({
      where: { contractorId, isBooked: false },
      orderBy: { start: "asc" }
    });
    res.json({ ok: true, slots });
  });

  // Client books a slot
  router.post("/jobs/:jobId/book", async (req, res) => {
    const { slotId, clientId } = req.body as { slotId: string; clientId: string };
    const jobId = req.params.jobId;
    try {
      const slot = await prisma.availability.findUnique({ where: { id: slotId } });
      if (!slot || slot.isBooked) return res.status(400).json({ error: "Slot unavailable" });
      await prisma.availability.update({ where: { id: slotId }, data: { isBooked: true } });
      const booking = await prisma.booking.create({
        data: {
          jobId,
          contractorId: slot.contractorId,
          clientId,
          slotId,
          start: slot.start,
          end: slot.end
        }
      });
      res.json({ ok: true, booking });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
