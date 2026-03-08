import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString);

export const db = drizzle(client, { schema });

export * from "./schema/index";
export { sql, eq, and, or, desc, asc, gt, gte, lt, lte, ne, isNull, isNotNull, inArray, notInArray, like, ilike, between } from "drizzle-orm";
