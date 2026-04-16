import { Router } from "express";
import { matchProfessionals } from "../match";
const router = Router();

// Example: POST /api/match
router.post("/", (req, res) => {
  const { professionals, location, radiusKm } = req.body;
  if (!professionals || !location || !radiusKm) return res.status(400).json({ error: "Missing parameters" });
  const matches = matchProfessionals(professionals, location, radiusKm);
  res.json({ matches });
});

export default router;
