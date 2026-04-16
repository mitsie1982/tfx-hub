// TFX Dispute Center Express Router
const express = require('express');
const router = express.Router();

const prisma = require('../db/prisma');

// 1. CREATE DISPUTE
router.post('/', async (req, res) => {
  const { jobId, parties, chatHistory } = req.body;
  try {
    const dispute = await prisma.dispute.create({
      data: {
        jobId,
        parties,
        chatHistory,
        status: 'OPEN',
        resolution: null
      }
    });
    res.json({ message: 'Dispute created', dispute });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create dispute', details: err.message });
  }
});

// 2. GET ALL DISPUTES
router.get('/', async (req, res) => {
  try {
    const disputes = await prisma.dispute.findMany();
    res.json(disputes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch disputes', details: err.message });
  }
});

// 3. GET SINGLE DISPUTE
router.get('/:id', async (req, res) => {
  try {
    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    res.json(dispute);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dispute', details: err.message });
  }
});

// 4. UPDATE STATUS (Admin)
router.post('/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const dispute = await prisma.dispute.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json({ message: 'Status updated', dispute });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Dispute not found' });
    res.status(500).json({ error: 'Failed to update status', details: err.message });
  }
});

// 5. RESOLVE DISPUTE (Admin)
router.post('/:id/resolve', async (req, res) => {
  const { resolution } = req.body;
  try {
    const dispute = await prisma.dispute.update({
      where: { id: req.params.id },
      data: { status: 'RESOLVED', resolution }
    });
    res.json({ message: 'Dispute resolved', dispute });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Dispute not found' });
    res.status(500).json({ error: 'Failed to resolve dispute', details: err.message });
  }
});

module.exports = router;
