import { Router } from "express";

// In-memory DB
let availabilityDB: any[] = [];
let bookingsDB: any[] = [];
let idCounter = 1;

const router = Router();

// 1. Set contractor availability
router.post("/contractors/:id/availability", (req, res) => {
  const contractorId = req.params.id;
  const { slots } = req.body;
  const created = slots.map((slot: any) => {
    const newSlot = {
      id: idCounter++,
      contractorId,
      start: slot.start,
      end: slot.end,
      reserved: false
    };
    availabilityDB.push(newSlot);
    return newSlot;
  });
  res.json({ message: "Availability set", slots: created });
});

// 2. Get contractor availability
router.get("/contractors/:id/availability", (req, res) => {
  const contractorId = req.params.id;
  const slots = availabilityDB.filter(s => s.contractorId === contractorId && !s.reserved);
  res.json(slots);
});

// 3. Book a slot
router.post("/jobs/:id/book", (req, res) => {
  const jobId = req.params.id;
  const { contractorId, slotId } = req.body;
  const slot = availabilityDB.find(s => s.id === slotId);
  if (!slot || slot.reserved) {
    return res.status(400).json({ error: "Slot not available" });
  }
  slot.reserved = true;
  const booking = {
    id: idCounter++,
    contractorId,
    jobId,
    slotId
  };
  bookingsDB.push(booking);
  const calendarLink = generateCalendarLink(slot);
  res.json({ message: "Booking confirmed", booking, calendarLink });
});

// 4. Calendar sync (stub)
router.post("/calendar/sync", (req, res) => {
  const { bookingId } = req.body;
  const booking = bookingsDB.find(b => b.id === bookingId);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }
  const slot = availabilityDB.find(s => s.id === booking.slotId);
  const calendarLink = generateCalendarLink(slot);
  res.json({ message: "Calendar synced", calendarLink });
});

function generateCalendarLink(slot: any) {
  const start = new Date(slot.start).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const end = new Date(slot.end).toISOString().replace(/[-:]|\.\d{3}/g, "");
  return `https://www.google.com/calendar/render?action=TEMPLATE&dates=${start}/${end}&text=TFX+Job+Booking`;
}

// 5. WhatsApp simulation (stub)
router.post("/whatsapp/send", (req, res) => {
  const { to, message } = req.body;
  res.json({ ok: true, to, message, info: "WhatsApp message simulated" });
});

export default router;
