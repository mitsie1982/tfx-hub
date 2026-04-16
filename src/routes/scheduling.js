const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const schedulingRouter = require("./src/routes/scheduling");

module.exports = schedulingRouter(prisma);
