import { Router } from "express";
const router = Router();

const getDemoUsers = () => (global as any).demoUsers as any[];
const DEMO_MODE = process.env.DEMO_MODE === "true";

// GET /api/profiles - list demo users (contractors and customers)
router.get("/", (req, res) => {
  if (DEMO_MODE && getDemoUsers()) {
    return res.json(getDemoUsers());
  }
  res.json([{ id: 1, name: "John Smit", tier: 1 }]);
});

// POST /api/profiles - upsert contractor in demo mode
router.post("/", (req, res) => {
  if (!DEMO_MODE || !getDemoUsers()) return res.status(501).json({ error: "Not implemented outside DEMO_MODE" });
  const { role, name, phone, location, skills, hourly_rate } = req.body;
  if (!role || !name || !phone) return res.status(400).json({ error: "Missing required fields" });
  const users = getDemoUsers();
  let user = users.find((u) => u.phone === phone);
  if (!user) {
    user = { id: `demo-${role}-${users.length + 1}`, name, phone, type: role, location, skills, hourly_rate };
    users.push(user);
  } else {
    Object.assign(user, { name, location, skills, hourly_rate });
  }
  res.json(user);
});

// GET /api/profiles/:id - fetch single demo user by id
router.get("/:id", (req, res) => {
  if (DEMO_MODE && getDemoUsers()) {
    const user = getDemoUsers().find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  }
  res.status(404).json({ error: "User not found" });
});

export default router;
