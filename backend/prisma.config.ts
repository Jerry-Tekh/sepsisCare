import "dotenv/config";
import { defineConfig } from "prisma/config";

const isGenerateCommand = process.argv.includes("generate");
const datasourceUrl = process.env.DIRECT_URL ||
  (isGenerateCommand ? "postgresql://localhost:5432/prisma_generate" : undefined);

if (!datasourceUrl) {
  throw new Error("DIRECT_URL must be set to run Prisma migration commands.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: datasourceUrl,
  },
});
