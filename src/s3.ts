import AWS from "aws-sdk";

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "minio",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "minio123",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

export function getPresignedUrl(bucket: string, key: string, expires = 900): Promise<string> {
  return s3.getSignedUrlPromise("putObject", {
    Bucket: bucket,
    Key: key,
    Expires: expires,
  });
}
