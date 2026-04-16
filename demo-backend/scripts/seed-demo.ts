// Deterministic demo data seeder for reproducible tests
import { prisma } from "../src/db";

async function main() {
  // Clear tables
  await prisma.job.deleteMany({});
  await prisma.professional.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.notificationFailure.deleteMany({});

  // Insert deterministic professionals
  await prisma.professional.createMany({
    data: [
      { id: "prof-1", name: "John Smit", tier: 1, jobs: 247, rating: 4.8, nhbrc: true, mbsa: false },
      { id: "prof-2", name: "Sarah Khubone", tier: 2, jobs: 156, rating: 4.7, nhbrc: false, mbsa: true },
      { id: "prof-3", name: "Thabo Mthembu", tier: 3, jobs: 67, rating: 4.6, nhbrc: false, mbsa: false },
      { id: "prof-4", name: "Naledi Khumalo", tier: 4, jobs: 4, rating: 3.8, nhbrc: false, mbsa: false },
    ],
  });

  // Insert deterministic jobs with fixed coordinates
  await prisma.job.createMany({
    data: [
      { id: "job-1", title: "Paint House", status: "open", contractorId: "prof-1", customerId: "cust-1" },
      { id: "job-2", title: "Fix Roof", status: "in_progress", contractorId: "prof-2", customerId: "cust-1" },
      { id: "job-3", title: "Install Solar", status: "completed", contractorId: "prof-3", customerId: "cust-1" },
    ],
  });

  // Insert deterministic profiles
  await prisma.profile.createMany({
    data: [
      { id: "cust-1", name: "Demo Customer 1", role: "customer", phone: "+10000000001" },
      { id: "prof-1", name: "John Smit", role: "contractor", phone: "+10000000002" },
      { id: "prof-2", name: "Sarah Khubone", role: "contractor", phone: "+10000000003" },
      { id: "prof-3", name: "Thabo Mthembu", role: "contractor", phone: "+10000000004" },
      { id: "prof-4", name: "Naledi Khumalo", role: "contractor", phone: "+10000000005" },
    ],
  });

  // Optionally: Insert deterministic notifications, failures, etc.
}

main()
  .then(() => {
    console.log("Deterministic demo data seeded.");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
