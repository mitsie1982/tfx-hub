import { Router } from "express";
const router = Router();


// Example: GET /api/profiles
router.get("/", (req, res) => {
  // TODO: Fetch profiles from DB
  res.json([{ id: 1, name: "John Smit", tier: 1 }]);
});

export default router;
