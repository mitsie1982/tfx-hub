import { Router } from "express";
import { getSignedGetUrl } from "../s3";
const router = Router();

// Example: POST /api/uploads/presign
// Accepts: { filename, contentType } and uses demo defaults for bucket/key if not provided
import * as metrics from "../metrics";
router.post("/presign", async (req, res) => {
  metrics.uploadPresignRequests.inc();
  let { key, filename, contentType } = req.body;
  // For demo, default bucket/key if not provided
  if (!key && filename) key = filename;
  if (!key) key = `upload-${Date.now()}`;
  try {
    const url = await getSignedGetUrl(key);
    res.json({ url, key });
  } catch (e) {
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
});

// GET /admin/uploads/:key - stream file from demo S3 bucket
router.get("/admin/uploads/:key", async (req, res) => {
  const bucket = "demo-uploads";
  const key = req.params.key;
  try {
    const s3 = require("../s3");
    const AWS = require("aws-sdk");
    const s3Client = new AWS.S3({
      endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "minio",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "minio123",
      s3ForcePathStyle: true,
      signatureVersion: "v4",
    });
    const s3Stream = s3Client.getObject({ Bucket: bucket, Key: key }).createReadStream();
    s3Stream.on("error", (err: Error) => {
      res.status(404).json({ error: "File not found" });
    });
    s3Stream.pipe(res);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

export default router;
