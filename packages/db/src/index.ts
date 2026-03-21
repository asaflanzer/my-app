import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema/index";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString, { connect_timeout: 30 });

export const db = drizzle(client, { schema });

export async function runMigrations(migrationsFolder: string) {
  const migrationClient = postgres(connectionString!, { max: 1, connect_timeout: 30 });
  const migrationDb = drizzle(migrationClient, { schema });
  try {
    await migrate(migrationDb, { migrationsFolder });
  } finally {
    await migrationClient.end();
  }
}

export * from "./schema/index";
export { sql, eq, and, or, desc, asc, gt, gte, lt, lte, ne, isNull, isNotNull, inArray, notInArray, like, ilike, between } from "drizzle-orm";
