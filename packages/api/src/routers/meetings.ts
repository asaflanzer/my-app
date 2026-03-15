import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { leagues, leagueMembers, leagueTables, meetings, meetingPlayers, matchTables, matchHistory, users } from "@my-app/db";
import { eq, and, sql, desc, inArray, asc, or } from "@my-app/db";
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

async function assertLeagueMemberOrHost(
  ctx: { db: typeof import("@my-app/db").db; session: { user: { id: string } } },
  leagueId: string,
) {
  const [league] = await ctx.db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  if (!league) throw new TRPCError({ code: "NOT_FOUND" });
  const isHost = league.hostId === ctx.session.user.id;
  if (!isHost) await getMembership(ctx, leagueId);
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
          status: meetings.status,
          createdAt: meetings.createdAt,
        })
        .from(meetings)
        .where(eq(meetings.leagueId, input.leagueId))
        .orderBy(desc(meetings.meetingNumber));

      return rows;
    }),

  activate: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
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
        status: "active",
        createdAt: now,
      });

      // Initialize match tables from configured league tables
      const configuredTables = await ctx.db
        .select()
        .from(leagueTables)
        .where(eq(leagueTables.leagueId, input.leagueId))
        .orderBy(asc(leagueTables.tableNumber));

      if (configuredTables.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No tables configured for this league" });
      }

      const tableRows = configuredTables.map((lt) => ({
        id: nanoid(),
        meetingId,
        tableNumber: lt.tableNumber,
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
        .where(eq(matchTables.meetingId, meeting.id))
        .orderBy(matchTables.tableNumber);

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
      const newScore = Math.max(0, Math.min(input.raceTo, current + input.delta));

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

      // Get meeting info for matchHistory
      const [meeting] = await ctx.db
        .select({ meetingNumber: meetings.meetingNumber })
        .from(meetings)
        .where(eq(meetings.id, input.meetingId))
        .limit(1);

      // Mark table as done
      await ctx.db
        .update(matchTables)
        .set({ status: "done", winnerId, updatedAt: now })
        .where(eq(matchTables.id, input.tableId));

      // Update winner stats: +2 pts, +1 win, +1 game
      await ctx.db
        .update(leagueMembers)
        .set({
          wins: sql`${leagueMembers.wins} + 1`,
          pts: sql`${leagueMembers.pts} + 2`,
          games: sql`${leagueMembers.games} + 1`,
        })
        .where(eq(leagueMembers.id, winnerId));

      // Update loser stats: +1 pt, +1 loss, +1 game
      await ctx.db
        .update(leagueMembers)
        .set({
          losses: sql`${leagueMembers.losses} + 1`,
          pts: sql`${leagueMembers.pts} + 1`,
          games: sql`${leagueMembers.games} + 1`,
        })
        .where(eq(leagueMembers.id, loserId));

      // Insert matchHistory record
      if (meeting) {
        await ctx.db.insert(matchHistory).values({
          id: nanoid(),
          leagueId: input.leagueId,
          meetingId: input.meetingId,
          meetingNumber: meeting.meetingNumber,
          tableNumber: table.tableNumber,
          player1Id: table.player1Id,
          player2Id: table.player2Id,
          score1,
          score2,
          winnerId,
          createdAt: now,
        });
      }

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

  getMatchesByMeeting: protectedProcedure
    .input(z.object({ leagueId: z.string(), meetingId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertLeagueMemberOrHost(ctx, input.leagueId);

      const rows = await ctx.db
        .select({
          id: matchHistory.id,
          meetingNumber: matchHistory.meetingNumber,
          tableNumber: matchHistory.tableNumber,
          player1Id: matchHistory.player1Id,
          player2Id: matchHistory.player2Id,
          score1: matchHistory.score1,
          score2: matchHistory.score2,
          winnerId: matchHistory.winnerId,
          createdAt: matchHistory.createdAt,
        })
        .from(matchHistory)
        .where(eq(matchHistory.meetingId, input.meetingId))
        .orderBy(asc(matchHistory.createdAt));

      // Enrich with player names
      const memberIds = [...new Set(
        rows.flatMap((r) => [r.player1Id, r.player2Id, r.winnerId].filter(Boolean) as string[])
      )];

      let nameMap = new Map<string, string>();
      if (memberIds.length > 0) {
        const memberRows = await ctx.db
          .select({ id: leagueMembers.id, name: users.name })
          .from(leagueMembers)
          .innerJoin(users, eq(leagueMembers.userId, users.id))
          .where(inArray(leagueMembers.id, memberIds));
        nameMap = new Map(memberRows.map((m) => [m.id, m.name ?? "Unknown"]));
      }

      return rows.map((r) => ({
        ...r,
        player1Name: r.player1Id ? (nameMap.get(r.player1Id) ?? "Unknown") : null,
        player2Name: r.player2Id ? (nameMap.get(r.player2Id) ?? "Unknown") : null,
        winnerName: r.winnerId ? (nameMap.get(r.winnerId) ?? "Unknown") : null,
      }));
    }),

  getPlayerHistory: protectedProcedure
    .input(z.object({ leagueId: z.string(), memberId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertLeagueMemberOrHost(ctx, input.leagueId);

      const rows = await ctx.db
        .select({
          id: matchHistory.id,
          meetingNumber: matchHistory.meetingNumber,
          tableNumber: matchHistory.tableNumber,
          player1Id: matchHistory.player1Id,
          player2Id: matchHistory.player2Id,
          score1: matchHistory.score1,
          score2: matchHistory.score2,
          winnerId: matchHistory.winnerId,
          createdAt: matchHistory.createdAt,
        })
        .from(matchHistory)
        .where(
          and(
            eq(matchHistory.leagueId, input.leagueId),
            or(
              eq(matchHistory.player1Id, input.memberId),
              eq(matchHistory.player2Id, input.memberId),
            ),
          ),
        )
        .orderBy(desc(matchHistory.createdAt));

      // Get opponent names
      const opponentIds = [...new Set(
        rows.map((r) =>
          r.player1Id === input.memberId ? r.player2Id : r.player1Id
        ).filter(Boolean) as string[]
      )];

      let nameMap = new Map<string, string>();
      if (opponentIds.length > 0) {
        const memberRows = await ctx.db
          .select({ id: leagueMembers.id, name: users.name })
          .from(leagueMembers)
          .innerJoin(users, eq(leagueMembers.userId, users.id))
          .where(inArray(leagueMembers.id, opponentIds));
        nameMap = new Map(memberRows.map((m) => [m.id, m.name ?? "Unknown"]));
      }

      return rows.map((r) => {
        const isPlayer1 = r.player1Id === input.memberId;
        const opponentId = isPlayer1 ? r.player2Id : r.player1Id;
        const myScore = isPlayer1 ? r.score1 : r.score2;
        const opponentScore = isPlayer1 ? r.score2 : r.score1;
        return {
          id: r.id,
          meetingNumber: r.meetingNumber,
          tableNumber: r.tableNumber,
          opponentId,
          opponentName: opponentId ? (nameMap.get(opponentId) ?? "Unknown") : null,
          myScore,
          opponentScore,
          won: r.winnerId === input.memberId,
          createdAt: r.createdAt,
        };
      });
    }),

  updateMatchRecord: protectedProcedure
    .input(
      z.object({
        leagueId: z.string(),
        matchId: z.string(),
        player1Id: z.string().nullable().optional(),
        player2Id: z.string().nullable().optional(),
        score1: z.number().int().min(0).optional(),
        score2: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      const [record] = await ctx.db
        .select()
        .from(matchHistory)
        .where(and(eq(matchHistory.id, input.matchId), eq(matchHistory.leagueId, input.leagueId)))
        .limit(1);
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });

      const updates: Partial<typeof matchHistory.$inferInsert> = {};
      if (input.player1Id !== undefined) updates.player1Id = input.player1Id;
      if (input.player2Id !== undefined) updates.player2Id = input.player2Id;
      if (input.score1 !== undefined) updates.score1 = input.score1;
      if (input.score2 !== undefined) updates.score2 = input.score2;

      // Recalculate winnerId if scores changed
      const newScore1 = input.score1 ?? record.score1;
      const newScore2 = input.score2 ?? record.score2;
      const newP1 = input.player1Id !== undefined ? input.player1Id : record.player1Id;
      const newP2 = input.player2Id !== undefined ? input.player2Id : record.player2Id;
      if (newScore1 !== newScore2) {
        updates.winnerId = newScore1 > newScore2 ? newP1 : newP2;
      }

      await ctx.db
        .update(matchHistory)
        .set(updates)
        .where(eq(matchHistory.id, input.matchId));
    }),
});
