// Picks the database type from DATABASE_URL before Prisma runs.
// Locally DATABASE_URL is "file:./dev.db" (SQLite) and nothing changes.
// Online DATABASE_URL starts with "postgres", so schema.prisma is switched to PostgreSQL.
// If DATABASE_URL_UNPOOLED is set (Neon), it is used for schema changes ("directUrl").
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL ?? "";
const path = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
let schema = readFileSync(path, "utf8");

if (/^postgres(ql)?:\/\//.test(url)) {
  schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  if (process.env.DATABASE_URL_UNPOOLED && !schema.includes("directUrl")) {
    schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url       = env("DATABASE_URL")\n  directUrl = env("DATABASE_URL_UNPOOLED")');
  }
  writeFileSync(path, schema);
  console.log("prepare-db: using PostgreSQL");
} else {
  console.log("prepare-db: using SQLite (local)");
}
