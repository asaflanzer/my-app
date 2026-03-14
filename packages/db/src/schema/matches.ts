import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { tournaments } from "./tournaments";
import { participants } from "./participants";

export const matches = pgTable("matches", {
  id: text("id").primaryKey(),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  matchNumber: integer("match_number").notNull(),
  participant1Id: text("participant1_id").references(() => participants.id, { onDelete: "set null" }),
  participant2Id: text("participant2_id").references(() => participants.id, { onDelete: "set null" }),
  winnerId: text("winner_id").references(() => participants.id, { onDelete: "set null" }),
  nextMatchId: text("next_match_id"), // FK to matches.id — wired after insert
  isLosersBracket: boolean("is_losers_bracket").notNull().default(false),
  status: text("status").notNull().default("pending"), // 'pending' | 'in_progress' | 'completed'
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
