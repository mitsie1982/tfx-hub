import { Router } from "express";
import { matchProfessionals } from "../match";
const router = Router();

// Example: POST /api/match

// DEMO: Accepts { location: {lat, lon}, radius_meters, nearest_n }
router.post("/", (req, res) => {
  const DEMO_MODE = process.env.DEMO_MODE === "true";
  const { location, radius_meters, nearest_n } = req.body;
  if (!location || (!radius_meters && !nearest_n)) {
    return res.status(400).json({ error: "Missing parameters" });
  }
  let contractors = [];
  if (DEMO_MODE && (global as any).demoUsers) {
    contractors = (global as any).demoUsers
      .filter((u: any) => u.type === "contractor")
      .map((u: any, idx: number) => ({
        id: u.id,
        name: u.name,
        lat: -26.005 + idx * 0.01, // fake lat/lon for demo
        lon: 27.905 + idx * 0.01,
      }));
  } else {
    contractors = req.body.professionals || [];
  }
  // Convert meters to km for radius
  const radiusKm = radius_meters ? radius_meters / 1000 : 5;
  let matches = matchProfessionals(contractors, location, radiusKm);
  if (nearest_n) matches = matches.slice(0, nearest_n);
  res.json({ matches });
});

export default router;
