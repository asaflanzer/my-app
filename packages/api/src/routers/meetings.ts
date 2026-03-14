import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { leagues, leagueMembers, meetings, meetingPlayers, matchTables } from "@my-app/db";
import { eq, and, sql, desc, inArray } from "@my-app/db";
import { TRPCError } from "@trpc/server";

function nanoid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

async function assertLeagueHost(
  ctx: { db: typeof import("@my-app/db").db; session: { user: { id: string } } },
  leagueId: string,
) {
  const [league] = await ctx.db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league) throw new TRPCError({ code: "NOT_FOUND" });
  if (league.hostId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
  return league;
}

async function assertMeetingActive(
  ctx: { db: typeof import("@my-app/db").db },
  meetingId: string,
) {
  const [meeting] = await ctx.db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
  if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
  if (meeting.status !== "active")
    throw new TRPCError({ code: "BAD_REQUEST", message: "Meeting is not active" });
}

async function getMembership(
  ctx: { db: typeof import("@my-app/db").db; session: { user: { id: string } } },
  leagueId: string,
) {
  const [member] = await ctx.db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, ctx.session.user.id)))
    .limit(1);
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Not a league member" });
  return member;
}

export const meetingRouter = router({
  reset: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);
      await ctx.db.delete(meetings).where(eq(meetings.leagueId, input.leagueId));
    }),

  list: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [league] = await ctx.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);
      if (!league) throw new TRPCError({ code: "NOT_FOUND" });
      const isHost = league.hostId === ctx.session.user.id;
      if (!isHost) await getMembership(ctx, input.leagueId);

      const rows = await ctx.db
        .select({
          id: meetings.id,
          meetingNumber: meetings.meetingNumber,
          gameType: meetings.gameType,
          status: meetings.status,
          scheduledAt: meetings.scheduledAt,
        })
        .from(meetings)
        .where(eq(meetings.leagueId, input.leagueId))
        .orderBy(desc(meetings.meetingNumber));

      return rows;
    }),

  activate: protectedProcedure
    .input(
      z.object({
        leagueId: z.string(),
        gameType: z.enum(["8ball", "9ball"]).default("8ball"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      // Count existing meetings for this league
      const existingMeetings = await ctx.db
        .select()
        .from(meetings)
        .where(eq(meetings.leagueId, input.leagueId));
      const meetingNumber = existingMeetings.length + 1;

      const meetingId = nanoid();
      const now = new Date();

      await ctx.db.insert(meetings).values({
        id: meetingId,
        leagueId: input.leagueId,
        meetingNumber,
        gameType: input.gameType,
        status: "active",
        scheduledAt: now,
        createdAt: now,
      });

      // Initialize 20 idle match tables
      const tableRows = Array.from({ length: 20 }, (_, i) => ({
        id: nanoid(),
        meetingId,
        tableNumber: i + 1,
        score1: 0,
        score2: 0,
        status: "idle" as const,
        createdAt: now,
        updatedAt: now,
      }));
      await ctx.db.insert(matchTables).values(tableRows);

      return { meetingId, meetingNumber };
    }),

  getActive: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .query(async ({ ctx, input }) => {
      await getMembership(ctx, input.leagueId);

      const [meeting] = await ctx.db
        .select()
        .from(meetings)
        .where(and(eq(meetings.leagueId, input.leagueId), inArray(meetings.status, ["active", "idle"])))
        .limit(1);

      if (!meeting) return null;

      const tables = await ctx.db
        .select()
        .from(matchTables)
        .where(eq(matchTables.meetingId, meeting.id));

      const players = await ctx.db
        .select()
        .from(meetingPlayers)
        .where(eq(meetingPlayers.meetingId, meeting.id));

      return { ...meeting, tables, players };
    }),

  complete: protectedProcedure
    .input(z.object({ leagueId: z.string(), meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      await ctx.db
        .update(meetings)
        .set({ status: "completed" })
        .where(and(eq(meetings.id, input.meetingId), eq(meetings.leagueId, input.leagueId)));
    }),

  togglePause: protectedProcedure
    .input(z.object({ leagueId: z.string(), meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      const [meeting] = await ctx.db
        .select()
        .from(meetings)
        .where(eq(meetings.id, input.meetingId))
        .limit(1);
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
      if (meeting.status === "completed")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Meeting is already completed" });

      const newStatus = meeting.status === "active" ? "idle" : "active";
      await ctx.db
        .update(meetings)
        .set({ status: newStatus })
        .where(eq(meetings.id, input.meetingId));

      return { status: newStatus };
    }),

  toggleReady: protectedProcedure
    .input(z.object({ leagueId: z.string(), meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertMeetingActive(ctx, input.meetingId);
      const member = await getMembership(ctx, input.leagueId);

      // Upsert meeting_player row
      const [existing] = await ctx.db
        .select()
        .from(meetingPlayers)
        .where(and(eq(meetingPlayers.meetingId, input.meetingId), eq(meetingPlayers.memberId, member.id)))
        .limit(1);

      if (!existing) {
        // Create as ready
        await ctx.db.insert(meetingPlayers).values({
          id: nanoid(),
          meetingId: input.meetingId,
          memberId: member.id,
          status: "ready",
        });
        return { status: "ready" };
      }

      if (existing.status === "playing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change status while playing" });
      }

      const newStatus = existing.status === "ready" ? "available" : "ready";
      await ctx.db
        .update(meetingPlayers)
        .set({ status: newStatus })
        .where(eq(meetingPlayers.id, existing.id));

      return { status: newStatus };
    }),

  draw: protectedProcedure
    .input(z.object({ leagueId: z.string(), meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertMeetingActive(ctx, input.meetingId);
      await getMembership(ctx, input.leagueId);

      // Get all ready players
      const readyPlayers = await ctx.db
        .select()
        .from(meetingPlayers)
        .where(and(eq(meetingPlayers.meetingId, input.meetingId), eq(meetingPlayers.status, "ready")));

      if (readyPlayers.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Need at least 2 ready players to draw" });
      }

      // Get idle tables
      const idleTables = await ctx.db
        .select()
        .from(matchTables)
        .where(and(eq(matchTables.meetingId, input.meetingId), eq(matchTables.status, "idle")));

      if (idleTables.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No idle tables available" });
      }

      // Shuffle ready players
      const shuffled = [...readyPlayers].sort(() => Math.random() - 0.5);
      const pairs: Array<[string, string]> = [];
      for (let i = 0; i + 1 < shuffled.length; i += 2) {
        pairs.push([shuffled[i]!.memberId, shuffled[i + 1]!.memberId]);
      }

      // Assign pairs to idle tables
      const tablesToUse = idleTables.slice(0, pairs.length);
      const now = new Date();

      for (let i = 0; i < pairs.length; i++) {
        const [p1, p2] = pairs[i]!;
        const table = tablesToUse[i]!;
        await ctx.db
          .update(matchTables)
          .set({ player1Id: p1, player2Id: p2, status: "active", score1: 0, score2: 0, updatedAt: now })
          .where(eq(matchTables.id, table.id));
      }

      // Mark all paired players as "playing"
      const pairedMemberIds = pairs.flat();
      for (const memberId of pairedMemberIds) {
        await ctx.db
          .update(meetingPlayers)
          .set({ status: "playing" })
          .where(and(eq(meetingPlayers.meetingId, input.meetingId), eq(meetingPlayers.memberId, memberId)));
      }
    }),

  updateScore: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        player: z.enum(["1", "2"]),
        delta: z.union([z.literal(1), z.literal(-1)]),
        raceTo: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [table] = await ctx.db
        .select()
        .from(matchTables)
        .where(eq(matchTables.id, input.tableId))
        .limit(1);
      if (!table) throw new TRPCError({ code: "NOT_FOUND" });
      if (table.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Table is not active" });
      await assertMeetingActive(ctx, table.meetingId);

      const field = input.player === "1" ? "score1" : "score2";
      const current = input.player === "1" ? table.score1 : table.score2;
      const newScore = Math.max(0, Math.min(input.raceTo - 1, current + input.delta));

      await ctx.db
        .update(matchTables)
        .set({ [field]: newScore, updatedAt: new Date() })
        .where(eq(matchTables.id, input.tableId));
    }),

  submitScore: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        meetingId: z.string(),
        leagueId: z.string(),
        raceTo: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [table] = await ctx.db
        .select()
        .from(matchTables)
        .where(eq(matchTables.id, input.tableId))
        .limit(1);
      if (!table) throw new TRPCError({ code: "NOT_FOUND" });
      if (table.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Table is not active" });
      await assertMeetingActive(ctx, input.meetingId);
      if (!table.player1Id || !table.player2Id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Table must have two players" });
      }

      const { score1, score2 } = table;
      if (score1 !== input.raceTo && score2 !== input.raceTo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `One player must have reached ${input.raceTo}` });
      }

      const winnerId = score1 === input.raceTo ? table.player1Id : table.player2Id;
      const loserId = score1 === input.raceTo ? table.player2Id : table.player1Id;
      const now = new Date();

      // Mark table as done
      await ctx.db
        .update(matchTables)
        .set({ status: "done", winnerId, updatedAt: now })
        .where(eq(matchTables.id, input.tableId));

      // Update winner stats: +2 pts, +1 win
      await ctx.db
        .update(leagueMembers)
        .set({
          wins: sql`${leagueMembers.wins} + 1`,
          pts: sql`${leagueMembers.pts} + 2`,
        })
        .where(eq(leagueMembers.id, winnerId));

      // Update loser stats: +1 pt, +1 loss
      await ctx.db
        .update(leagueMembers)
        .set({
          losses: sql`${leagueMembers.losses} + 1`,
          pts: sql`${leagueMembers.pts} + 1`,
        })
        .where(eq(leagueMembers.id, loserId));

      // Set both players back to "available"
      for (const memberId of [table.player1Id, table.player2Id]) {
        await ctx.db
          .update(meetingPlayers)
          .set({ status: "available" })
          .where(and(eq(meetingPlayers.meetingId, input.meetingId), eq(meetingPlayers.memberId, memberId)));
      }
    }),

  takeBreak: protectedProcedure
    .input(z.object({ leagueId: z.string(), meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertMeetingActive(ctx, input.meetingId);
      const member = await getMembership(ctx, input.leagueId);
      const now = new Date();

      // Find member's active table
      const allTables = await ctx.db
        .select()
        .from(matchTables)
        .where(and(eq(matchTables.meetingId, input.meetingId), eq(matchTables.status, "active")));

      const myTable = allTables.find(
        (t) => t.player1Id === member.id || t.player2Id === member.id,
      );
      if (!myTable) throw new TRPCError({ code: "NOT_FOUND", message: "No active table found" });

      // Clear both players, reset table to idle
      await ctx.db
        .update(matchTables)
        .set({ player1Id: null, player2Id: null, score1: 0, score2: 0, status: "idle", updatedAt: now })
        .where(eq(matchTables.id, myTable.id));

      // Set both players to available
      const playerIds = [myTable.player1Id, myTable.player2Id].filter(Boolean) as string[];
      for (const memberId of playerIds) {
        await ctx.db
          .update(meetingPlayers)
          .set({ status: "available" })
          .where(and(eq(meetingPlayers.meetingId, input.meetingId), eq(meetingPlayers.memberId, memberId)));
      }
    }),

  shufflePlayer: protectedProcedure
    .input(z.object({ leagueId: z.string(), meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertMeetingActive(ctx, input.meetingId);
      const member = await getMembership(ctx, input.leagueId);
      const now = new Date();

      // Find member's active table
      const allTables = await ctx.db
        .select()
        .from(matchTables)
        .where(and(eq(matchTables.meetingId, input.meetingId), eq(matchTables.status, "active")));

      const myTable = allTables.find(
        (t) => t.player1Id === member.id || t.player2Id === member.id,
      );
      if (!myTable) throw new TRPCError({ code: "NOT_FOUND", message: "No active table found" });

      // Find available players
      const availablePlayers = await ctx.db
        .select()
        .from(meetingPlayers)
        .where(and(eq(meetingPlayers.meetingId, input.meetingId), eq(meetingPlayers.status, "available")));

      if (availablePlayers.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No available players to swap in" });
      }

      // Pick a random available player
      const replacement = availablePlayers[Math.floor(Math.random() * availablePlayers.length)]!;

      // Swap: replace member with replacement
      const isPlayer1 = myTable.player1Id === member.id;
      await ctx.db
        .update(matchTables)
        .set({
          player1Id: isPlayer1 ? replacement.memberId : myTable.player1Id,
          player2Id: isPlayer1 ? myTable.player2Id : replacement.memberId,
          score1: 0,
          score2: 0,
          updatedAt: now,
        })
        .where(eq(matchTables.id, myTable.id));

      // Old player → available, new player → playing
      await ctx.db
        .update(meetingPlayers)
        .set({ status: "available" })
        .where(and(eq(meetingPlayers.meetingId, input.meetingId), eq(meetingPlayers.memberId, member.id)));

      await ctx.db
        .update(meetingPlayers)
        .set({ status: "playing" })
        .where(eq(meetingPlayers.id, replacement.id));
    }),
});
