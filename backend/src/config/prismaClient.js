const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const env = require("./env");

// Avoid creating many PrismaClient instances under nodemon's hot-reload.
const globalForPrisma = global;
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    adapter,
    log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"],
  });

if (env.nodeEnv === "development") {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
