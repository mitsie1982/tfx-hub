// seed-demo.js
// Idempotent demo data seeding for ACME demo
const db = require("./db");
const uuid = require("uuid");

async function seed() {
  await db.connect();
  // Upsert demo users
  await db.users.upsert(
    { external_id: "demo-customer-1" },
    {
      external_id: "demo-customer-1",
      name: "Demo Customer",
      phone: "+10000000001",
      role: "customer",
      demo: true,
    },
  );
  await db.users.upsert(
    { external_id: "demo-contractor-1" },
    {
      external_id: "demo-contractor-1",
      name: "Demo Contractor",
      phone: "+10000000002",
      role: "contractor",
      demo: true,
    },
  );
  // Upsert demo jobs
  const jobs = [
    { id: "demo-job-1", title: "Fix leaky faucet", status: "open" },
    { id: "demo-job-2", title: "Install shelves", status: "in_progress" },
    { id: "demo-job-3", title: "Paint fence", status: "completed" },
  ];
  for (const j of jobs) {
    await db.jobs.upsert({ id: j.id }, j);
  }
  console.log("Demo seed complete");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
