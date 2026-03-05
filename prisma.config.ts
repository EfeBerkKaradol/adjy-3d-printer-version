import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Pooled URL (Neon connection pooler)
    url: process.env["DATABASE_URL"],
    // Direct URL for migrations (bypasses pooler)
    directUrl: process.env["DIRECT_DATABASE_URL"],
  },
});
