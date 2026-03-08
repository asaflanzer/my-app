import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import path from "path";

// Load root .env when running drizzle-kit directly from packages/db
config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "./src/schema/*",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"]!,
  },
  verbose: true,
  strict: true,
});
