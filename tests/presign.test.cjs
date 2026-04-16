const { presignUpload, getSignedGetUrl } = require("../src/s3");
const crypto = require("crypto");

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(async () => "https://mock-s3-url"),
}));

describe("S3 presign helpers", () => {
  it("presignUpload returns url, key, expiresIn", async () => {
    const { url, key, expiresIn } = await presignUpload({ filename: "test.pdf", contentType: "application/pdf" });
    expect(url).toMatch(/^https:\/\/mock-s3-url/);
    expect(key).toMatch(/uploads\//);
    expect(key).toMatch(/test.pdf$/);
    expect(expiresIn).toBe(300);
  });

  it("getSignedGetUrl returns url", async () => {
    const url = await getSignedGetUrl("uploads/abc.pdf");
    expect(url).toMatch(/^https:\/\/mock-s3-url/);
  });
});
