import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const hosts = pgTable("hosts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Host = typeof hosts.$inferSelect;
export type NewHost = typeof hosts.$inferInsert;
