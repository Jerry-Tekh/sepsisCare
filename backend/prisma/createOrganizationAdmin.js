require("dotenv").config();

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
const required = ["ORG_NAME", "ORG_ADMIN_NAME", "ORG_ADMIN_EMAIL", "ORG_ADMIN_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);

if (!connectionString) missing.push("DATABASE_URL (or DIRECT_URL)");
if (missing.length) {
  console.error(`Set the following environment variables before running admin:create: ${missing.join(", ")}`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = process.env.ORG_ADMIN_EMAIL.trim().toLowerCase();
  const password = process.env.ORG_ADMIN_PASSWORD;
  if (password.length < 8) throw new Error("ORG_ADMIN_PASSWORD must be at least 8 characters");

  const organization = await prisma.healthcareOrganization.upsert({
    where: { name: process.env.ORG_NAME.trim() },
    update: {},
    create: { name: process.env.ORG_NAME.trim() },
  });
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = existing
    ? await prisma.user.update({
        where: { email },
        data: {
          fullName: process.env.ORG_ADMIN_NAME.trim(),
          password: passwordHash,
          role: "ORGANIZATION_ADMIN",
          organizationId: organization.id,
        },
      })
    : await prisma.user.create({
        data: {
          fullName: process.env.ORG_ADMIN_NAME.trim(),
          email,
          password: passwordHash,
          role: "ORGANIZATION_ADMIN",
          organizationId: organization.id,
        },
      });

  console.log(`Organization admin ready: ${admin.email} (${organization.name}). Sign in through the existing login page.`);
}

main()
  .catch((error) => {
    console.error("Could not create organization admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
