import { PrismaClient } from "@prisma/client";
import request from "supertest";
import app from "../src/server"; // Adjust import if your app entry is elsewhere

const prisma = new PrismaClient();

describe("Job Accept Concurrency", () => {
  let jobId: string;

  beforeAll(async () => {
    // Create a job with required fields
    const job = await prisma.job.create({
      data: {
        customerId: "customer-1",
        title: "Test Job",
        status: "offered",
        version: 1,
        // Add any other required fields for your schema
      },
    });
    jobId = job.id;
  });

  afterAll(async () => {
    await prisma.job.deleteMany({ where: { id: jobId } });
    await prisma.$disconnect();
  });

  test("concurrent accept attempts: one wins, one conflicts", async () => {
    // fire two accept requests in parallel with same version
    const [r1, r2] = await Promise.allSettled([
      request(app).post(`/api/jobs/${jobId}/accept`).send({ contractorId: "c1", version: 1 }),
      request(app).post(`/api/jobs/${jobId}/accept`).send({ contractorId: "c2", version: 1 }),
    ]);

    // Collect results
    const results = [r1, r2].map((r) =>
      r.status === "fulfilled"
        ? { status: r.value.status, body: r.value.body }
        : { status: r.reason.response?.status, body: r.reason.response?.body },
    );

    // One should be 200, one should be 409
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);

    // Optionally, check the winner/loser details
    const winner = results.find((r) => r.status === 200);
    const loser = results.find((r) => r.status === 409);
    expect(winner?.body.ok).toBe(true);
    expect(loser?.body.error).toMatch(/Conflict|already accepted/i);
  });
});
