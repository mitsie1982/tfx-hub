import { PrismaClient } from "@prisma/client";
import schedulingRouter from "./routes/scheduling";

const prisma = new PrismaClient();
export default schedulingRouter(prisma);
