/**
 * SelfGlow — Drizzle Kit Configuration
 *
 * Used by `npx drizzle-kit generate` to produce SQL migration files
 * from the Drizzle ORM schema. These migrations are then applied
 * at runtime via expo-sqlite + drizzle-orm/expo-sqlite.
 *
 * Usage:
 *   npx drizzle-kit generate
 *   npx drizzle-kit push   (for dev — applies directly without migration files)
 */

import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;
