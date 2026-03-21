import { pgTable, text, integer, boolean, timestamp, uniqueIndex, json } from "drizzle-orm/pg-core";
import { users } from "./users";

export const leagues = pgTable("leagues", {
  id: text("id").primaryKey(),
  hostId: text("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  startDate: text("start_date"), // ISO date string, nullable
  startTime: text("start_time").notNull().default("19:00"),
  regularMeetings: integer("regular_meetings").notNull().default(7),
  playoffMeetings: integer("playoff_meetings").notNull().default(2),
  maxPlayers: integer("max_players").notNull().default(32),
  isPublic: boolean("is_public").notNull().default(false),
  // Playoff settings — configured by the host before the bracket is initialised
  playoffRaceTo: integer("playoff_race_to").notNull().default(3),           // 3 or 7
  playoffGameType: text("playoff_game_type").notNull().default("8-ball"),   // '8-ball' | '9-ball'
  // Full bracket state stored as JSON; null until host calls initBracket
  playoffBracket: json("playoff_bracket"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leagueMembers = pgTable(
  "league_members",
  {
    id: text("id").primaryKey(),
    leagueId: text("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    games: integer("games").notNull().default(0),
    score: integer("score").notNull().default(0),
    disabled: boolean("disabled").notNull().default(false),
    isQualified: boolean("is_qualified").notNull().default(false),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("league_members_league_user_idx").on(t.leagueId, t.userId)],
);

export const leagueTables = pgTable(
  "league_tables",
  {
    id: text("id").primaryKey(),
    leagueId: text("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    tableNumber: integer("table_number").notNull(),
  },
  (t) => [uniqueIndex("league_tables_league_table_idx").on(t.leagueId, t.tableNumber)],
);

export type League = typeof leagues.$inferSelect;
export type NewLeague = typeof leagues.$inferInsert;
export type LeagueMember = typeof leagueMembers.$inferSelect;
export type NewLeagueMember = typeof leagueMembers.$inferInsert;
export type LeagueTable = typeof leagueTables.$inferSelect;
export type NewLeagueTable = typeof leagueTables.$inferInsert;
