// Minimal S3 helper for presigned URL demo
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  accessKeyId: process.env.S3_ACCESS_KEY || "minio",
  secretAccessKey: process.env.S3_SECRET_KEY || "minio123",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

function getPresignedUrl(bucket, key, expires = 900) {
  return s3.getSignedUrlPromise("putObject", {
    Bucket: bucket,
    Key: key,
    Expires: expires,
  });
}

module.exports = { getPresignedUrl };
