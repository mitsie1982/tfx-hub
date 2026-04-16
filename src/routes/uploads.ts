import { Router } from "express";
import { getPresignedUrl } from "../s3";
const router = Router();

// Example: POST /api/uploads/presign
router.post("/presign", async (req, res) => {
  const { bucket, key } = req.body;
  if (!bucket || !key) return res.status(400).json({ error: "bucket and key required" });
  try {
    const url = await getPresignedUrl(bucket, key);
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
});

export default router;
