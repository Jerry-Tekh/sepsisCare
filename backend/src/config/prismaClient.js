const { PrismaClient } = require("@prisma/client");
const env = require("./env");

// Avoid creating many PrismaClient instances under nodemon's hot-reload.
const globalForPrisma = global;

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"],
  });

if (env.nodeEnv === "development") {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
