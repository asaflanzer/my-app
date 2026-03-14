import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const tournaments = pgTable("tournaments", {
  id: text("id").primaryKey(),
  hostId: text("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gameType: text("game_type").notNull(),
  status: text("status").notNull().default("draft"), // 'draft' | 'published' | 'completed'
  duration: text("duration").notNull(), // 'single_day' | 'multi_day' | 'recurring'
  format: text("format").notNull(), // 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'free_for_all' | 'leaderboard'
  secondFormat: text("second_format"), // nullable — same enum
  breakTies: boolean("break_ties").notNull().default(false),
  registrationType: text("registration_type").notNull(), // 'host_provided' | 'sign_up_page'
  isFree: boolean("is_free").notNull().default(true),
  requireTeams: boolean("require_teams").notNull().default(false),
  maxParticipants: integer("max_participants"),
  startDate: timestamp("start_date").notNull(),
  isTentative: boolean("is_tentative").notNull().default(false),
  requireCheckIn: boolean("require_check_in").notNull().default(false),
  shareableSlug: text("shareable_slug").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
