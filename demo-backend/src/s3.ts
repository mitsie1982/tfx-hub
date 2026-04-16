import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: !!process.env.S3_ENDPOINT,
});

export async function presignUpload({
  filename,
  contentType,
  expiresIn = 300,
}: {
  filename: string;
  contentType: string;
  expiresIn?: number;
}) {
  const key = `uploads/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${filename}`;
  const command = new PutObjectCommand({
    Bucket: requireEnv("S3_BUCKET"),
    Key: key,
    ContentType: contentType,
    ACL: "private",
  });
  const url = await getSignedUrl(s3, command, { expiresIn });
  return { url, key, expiresIn };
}

export async function getSignedGetUrl(key: string, expiresIn = 300) {
  const command = new GetObjectCommand({ Bucket: requireEnv("S3_BUCKET"), Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}
