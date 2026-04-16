import { PrismaClient } from "@prisma/client";

// Replace with your actual WhatsApp service import
// import { whatsappService } from './whatsappService';

interface NotifyParams {
  type: string;
  jobId: string;
  contractorId: string;
  customerId: string;
  extra?: Record<string, any>;
  prisma: PrismaClient;
  whatsappService: {
    sendTemplate: (opts: { to: string; template: string; vars: string[] }) => Promise<void>;
  };
}

export async function notify({
  type,
  jobId,
  contractorId,
  customerId,
  extra = {},
  prisma,
  whatsappService,
}: NotifyParams) {
  try {
    // In-app notifications
    await prisma.notification.createMany({
      data: [
        { userId: customerId, type, payload: JSON.stringify({ jobId, contractorId, ...extra }) },
        { userId: contractorId, type, payload: JSON.stringify({ jobId, ...extra }) },
      ],
    });

    // Fetch additional info if needed
    const job = extra.jobTitle ? { title: extra.jobTitle } : await prisma.job.findUnique({ where: { id: jobId } });
    const contractor = await prisma.profile.findUnique({ where: { id: contractorId } });
    const customer = await prisma.profile.findUnique({ where: { id: customerId } });

    // WhatsApp notification
    if (customer?.phone && job?.title && contractor?.name) {
      await whatsappService.sendTemplate({
        to: customer.phone,
        template: "job_accepted_customer",
        vars: [job.title, contractor.name],
      });
    }
  } catch (err) {
    console.error("Notification error:", err);
    // Optionally: report to monitoring/alerting
  }
}
