import { pgTable, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { leagues } from "./leagues";
import { leagueMembers } from "./leagues";

export const meetings = pgTable("meetings", {
  id: text("id").primaryKey(),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  meetingNumber: integer("meeting_number").notNull(),
  status: text("status").notNull().default("inactive"), // 'inactive' | 'active' | 'paused' | 'done'
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetingPlayers = pgTable(
  "meeting_players",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => leagueMembers.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("available"), // 'available' | 'ready' | 'playing'
  },
  (t) => [uniqueIndex("meeting_players_meeting_member_idx").on(t.meetingId, t.memberId)],
);

export const matchTables = pgTable("match_tables", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  tableNumber: integer("table_number").notNull(),
  player1Id: text("player1_id").references(() => leagueMembers.id, { onDelete: "set null" }),
  player2Id: text("player2_id").references(() => leagueMembers.id, { onDelete: "set null" }),
  score1: integer("score1").notNull().default(0),
  score2: integer("score2").notNull().default(0),
  status: text("status").notNull().default("idle"), // 'idle' | 'active' | 'done'
  winnerId: text("winner_id").references(() => leagueMembers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const matchHistory = pgTable("match_history", {
  id: text("id").primaryKey(),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  meetingId: text("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  meetingNumber: integer("meeting_number").notNull(),
  tableNumber: integer("table_number").notNull(),
  player1Id: text("player1_id").references(() => leagueMembers.id, { onDelete: "set null" }),
  player2Id: text("player2_id").references(() => leagueMembers.id, { onDelete: "set null" }),
  score1: integer("score1").notNull(),
  score2: integer("score2").notNull(),
  winnerId: text("winner_id").references(() => leagueMembers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type MeetingPlayer = typeof meetingPlayers.$inferSelect;
export type NewMeetingPlayer = typeof meetingPlayers.$inferInsert;
export type MatchTable = typeof matchTables.$inferSelect;
export type NewMatchTable = typeof matchTables.$inferInsert;
export type MatchHistory = typeof matchHistory.$inferSelect;
export type NewMatchHistory = typeof matchHistory.$inferInsert;
