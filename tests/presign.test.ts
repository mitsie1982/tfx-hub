import { getPresignedUrl } from "../src/s3";

describe("getPresignedUrl", () => {
  it("returns a presigned URL string", async () => {
    const url = await getPresignedUrl("test-bucket", "test-key");
    expect(typeof url).toBe("string");
    expect(url).toContain("test-bucket");
  });
});
