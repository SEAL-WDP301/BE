import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: DATABASE_URL not set");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRaw`SELECT NOW() as now, current_database() as db`;
  console.log("OK", JSON.stringify(rows[0]));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("FAIL", message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
