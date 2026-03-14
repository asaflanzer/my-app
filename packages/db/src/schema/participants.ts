import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { tournaments } from "./tournaments";
import { users } from "./users";

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  teamName: text("team_name"),
  isPlaceholder: boolean("is_placeholder").notNull().default(false),
  seed: integer("seed"),
  checkedIn: boolean("checked_in").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
