/**
 * Seeds the ClinicalPathway table from the centralized pathway registry
 * (src/modules/discovery/rulesEngine/pathways.config.js).
 *
 * This is an upsert, so it's safe to re-run.
 */

const { PrismaClient } = require("@prisma/client");
const pathwaysConfig = require("../src/modules/discovery/rulesEngine/pathways.config");

const prisma = new PrismaClient();

async function main() {
  const entries = Object.entries(pathwaysConfig);

  for (const [name, config] of entries) {
    await prisma.clinicalPathway.upsert({
      where: { name },
      update: {
        description: config.description,
        configuration: config,
      },
      create: {
        name,
        description: config.description,
        configuration: config,
      },
    });
    console.log(`Seeded pathway: ${name}`);
  }

  console.log(`Done. ${entries.length} pathways seeded.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
