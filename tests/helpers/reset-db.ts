import { prisma } from "@/lib/db";

/** Truncates every app table between tests, keeping the schema intact. */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const names = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  if (names) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
  }
}
