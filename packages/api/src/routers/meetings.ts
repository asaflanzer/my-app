import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { leagues, leagueMembers, leagueTables, meetings, meetingPlayers, matchTables, matchHistory, users } from "@my-app/db";
import { eq, and, sql, desc, inArray, asc, or, isNull } from "@my-app/db";
import { TRPCError } from "@trpc/server";

function secureShuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function secureRandomElement<T>(array: T[]): T {
  return array[crypto.getRandomValues(new Uint32Array(1))[0]! % array.length]!;
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

  initialize: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const league = await assertLeagueHost(ctx, input.leagueId);

      const existingMeetings = await ctx.db
        .select()
        .from(meetings)
        .where(eq(meetings.leagueId, input.leagueId));

      const hasStarted = existingMeetings.some((m) => m.status !== "inactive");
      if (hasStarted)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot reinitialize after meetings have started" });

      const regularCount = league.regularMeetings;
      const existingByNumber = new Map(existingMeetings.map((m) => [m.meetingNumber, m]));

      const calcDate = (num: number): Date | null =>
        league.startDate
          ? new Date(new Date(league.startDate).getTime() + (num - 1) * 7 * 24 * 60 * 60 * 1000)
          : null;

      // Delete excess meetings if regularMeetings was reduced
      const toDelete = existingMeetings.filter((m) => m.meetingNumber > regularCount);
      if (toDelete.length > 0)
        await ctx.db.delete(meetings).where(inArray(meetings.id, toDelete.map((m) => m.id)));

      // Update scheduled dates for existing meetings
      for (const meeting of existingMeetings.filter((m) => m.meetingNumber <= regularCount))
        await ctx.db.update(meetings).set({ scheduledDate: calcDate(meeting.meetingNumber) }).where(eq(meetings.id, meeting.id));

      // Insert missing meeting slots
      const toInsert = [];
      const now = new Date();
      for (let num = 1; num <= regularCount; num++) {
        if (!existingByNumber.has(num))
          toInsert.push({
            id: crypto.randomUUID(),
            leagueId: input.leagueId,
            meetingNumber: num,
            status: "inactive" as const,
            scheduledDate: calcDate(num),
            createdAt: now,
          });
      }
      if (toInsert.length > 0)
        await ctx.db.insert(meetings).values(toInsert);
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
          scheduledDate: meetings.scheduledDate,
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

      const allMeetings = await ctx.db
        .select()
        .from(meetings)
        .where(eq(meetings.leagueId, input.leagueId))
        .orderBy(asc(meetings.meetingNumber));

      // Find the first inactive meeting
      const nextMeeting = allMeetings.find((m) => m.status === "inactive");
      if (!nextMeeting)
        throw new TRPCError({ code: "BAD_REQUEST", message: "No inactive meetings to activate. Use Continue/Update first." });

      // Ensure all previous meetings are done
      const previousMeetings = allMeetings.filter((m) => m.meetingNumber < nextMeeting.meetingNumber);
      const allPrevDone = previousMeetings.every((m) => m.status === "done");
      if (!allPrevDone)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Previous meeting must be completed first" });

      // Update status to active
      await ctx.db
        .update(meetings)
        .set({ status: "active" })
        .where(eq(meetings.id, nextMeeting.id));

      // Initialize match tables from configured league tables
      const configuredTables = await ctx.db
        .select()
        .from(leagueTables)
        .where(eq(leagueTables.leagueId, input.leagueId))
        .orderBy(asc(leagueTables.tableNumber));

      if (configuredTables.length === 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "No tables configured for this league" });

      const now = new Date();
      const tableRows = configuredTables.map((lt) => ({
        id: crypto.randomUUID(),
        meetingId: nextMeeting.id,
        tableNumber: lt.tableNumber,
        score1: 0,
        score2: 0,
        status: "idle" as const,
        createdAt: now,
        updatedAt: now,
      }));
      await ctx.db.insert(matchTables).values(tableRows);

      return { meetingId: nextMeeting.id, meetingNumber: nextMeeting.meetingNumber };
    }),

  getActive: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .query(async ({ ctx, input }) => {
      await getMembership(ctx, input.leagueId);

      const [meeting] = await ctx.db
        .select()
        .from(meetings)
        .where(and(eq(meetings.leagueId, input.leagueId), inArray(meetings.status, ["active", "paused"])))
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
        .set({ status: "done" })
        .where(and(eq(meetings.id, input.meetingId), eq(meetings.leagueId, input.leagueId)));
    }),

  cleanupDuplicates: protectedProcedure
    .input(z.object({ leagueId: z.string(), meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      // Fetch all done match tables for this meeting
      const doneTables = await ctx.db
        .select()
        .from(matchTables)
        .where(and(eq(matchTables.meetingId, input.meetingId), eq(matchTables.status, "done")));

      // Group by normalized pair (sorted player IDs), keep newest per pair
      const pairMap = new Map<string, typeof doneTables[number]>();
      const toDelete: typeof doneTables = [];

      for (const table of doneTables) {
        if (!table.player1Id || !table.player2Id) continue;
        const key = [table.player1Id, table.player2Id].sort().join("|");
        const existing = pairMap.get(key);
        if (!existing || table.createdAt > existing.createdAt) {
          if (existing) toDelete.push(existing);
          pairMap.set(key, table);
        } else {
          toDelete.push(table);
        }
      }

      if (toDelete.length === 0) return { deleted: 0 };

      // For each stale table, reverse leagueMembers stats and delete matchHistory
      for (const table of toDelete) {
        const [history] = await ctx.db
          .select()
          .from(matchHistory)
          .where(and(
            eq(matchHistory.meetingId, input.meetingId),
            eq(matchHistory.player1Id, table.player1Id!),
            eq(matchHistory.player2Id, table.player2Id!),
          ))
          .limit(1);

        if (history?.winnerId) {
          const loserId = history.winnerId === history.player1Id
            ? history.player2Id
            : history.player1Id;
          const winnerScoreDelta = history.winnerId === history.player1Id
            ? history.score1 - history.score2
            : history.score2 - history.score1;

          await ctx.db
            .update(leagueMembers)
            .set({
              wins: sql`${leagueMembers.wins} - 1`,
              games: sql`${leagueMembers.games} - 1`,
              score: sql`${leagueMembers.score} - ${winnerScoreDelta}`,
            })
            .where(eq(leagueMembers.id, history.winnerId));

          if (loserId) {
            await ctx.db
              .update(leagueMembers)
              .set({
                losses: sql`${leagueMembers.losses} - 1`,
                games: sql`${leagueMembers.games} - 1`,
                score: sql`${leagueMembers.score} + ${winnerScoreDelta}`,
              })
              .where(eq(leagueMembers.id, loserId));
          }

          await ctx.db
            .delete(matchHistory)
            .where(eq(matchHistory.id, history.id));
        }

        await ctx.db
          .delete(matchTables)
          .where(eq(matchTables.id, table.id));
      }

      // Also delete rows with NULL player1 or player2 (unassigned idle tables)
      await ctx.db
        .delete(matchTables)
        .where(and(
          eq(matchTables.meetingId, input.meetingId),
          or(isNull(matchTables.player1Id), isNull(matchTables.player2Id)),
        ));

      return { deleted: toDelete.length };
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
      if (meeting.status === "done")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Meeting is already done" });
      if (meeting.status === "inactive")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Meeting has not started yet" });

      const newStatus = meeting.status === "active" ? "paused" : "active";
      await ctx.db
        .update(meetings)
        .set({ status: newStatus })
        .where(eq(meetings.id, input.meetingId));

      return { status: newStatus };
    }),

  updateDate: protectedProcedure
    .input(z.object({ leagueId: z.string(), meetingId: z.string(), scheduledDate: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);
      const [meeting] = await ctx.db
        .select()
        .from(meetings)
        .where(and(eq(meetings.id, input.meetingId), eq(meetings.leagueId, input.leagueId)))
        .limit(1);
      if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
      if (meeting.status === "done")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit date of a completed meeting" });
      await ctx.db
        .update(meetings)
        .set({ scheduledDate: new Date(input.scheduledDate) })
        .where(eq(meetings.id, input.meetingId));
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
          id: crypto.randomUUID(),
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

      // Build set of already-played pairs this meeting to avoid rematches
      const meetingHistory = await ctx.db
        .select()
        .from(matchHistory)
        .where(eq(matchHistory.meetingId, input.meetingId));
      const playedPairs = new Set<string>();
      for (const m of meetingHistory) {
        if (m.player1Id && m.player2Id)
          playedPairs.add([m.player1Id, m.player2Id].sort().join("|"));
      }

      // Shuffle ready players, retrying up to 10 times to avoid rematches
      let pairs: Array<[string, string]> = [];
      for (let attempt = 0; attempt < 10; attempt++) {
        const shuffled = secureShuffleArray(readyPlayers);
        const candidate: Array<[string, string]> = [];
        for (let i = 0; i + 1 < shuffled.length; i += 2)
          candidate.push([shuffled[i]!.memberId, shuffled[i + 1]!.memberId]);
        const hasRematch = candidate.some(([a, b]) =>
          playedPairs.has([a, b].sort().join("|")));
        if (!hasRematch || attempt === 9) { pairs = candidate; break; }
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
        score1: z.number().int().min(0),
        score2: z.number().int().min(0),
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

      const { score1, score2 } = input;
      if (score1 !== input.raceTo && score2 !== input.raceTo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `One player must have reached ${input.raceTo}` });
      }

      const winnerId = score1 === input.raceTo ? table.player1Id : table.player2Id;
      const now = new Date();

      // Get meeting info for matchHistory
      const [meeting] = await ctx.db
        .select({ meetingNumber: meetings.meetingNumber })
        .from(meetings)
        .where(eq(meetings.id, input.meetingId))
        .limit(1);

      // Mark table as done with confirmed scores
      await ctx.db
        .update(matchTables)
        .set({ status: "done", score1, score2, winnerId, updatedAt: now })
        .where(eq(matchTables.id, input.tableId));

      // Record match history and apply stats immediately
      if (meeting) {
        await ctx.db.insert(matchHistory).values({
          id: crypto.randomUUID(),
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

        const loserId = winnerId === table.player1Id ? table.player2Id : table.player1Id;
        const winnerScoreDelta = score1 === input.raceTo ? score1 - score2 : score2 - score1;

        await ctx.db
          .update(leagueMembers)
          .set({
            wins: sql`${leagueMembers.wins} + 1`,
            games: sql`${leagueMembers.games} + 1`,
            score: sql`${leagueMembers.score} + ${winnerScoreDelta}`,
          })
          .where(eq(leagueMembers.id, winnerId));

        await ctx.db
          .update(leagueMembers)
          .set({
            losses: sql`${leagueMembers.losses} + 1`,
            games: sql`${leagueMembers.games} + 1`,
            score: sql`${leagueMembers.score} - ${winnerScoreDelta}`,
          })
          .where(eq(leagueMembers.id, loserId));
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
      const replacement = secureRandomElement(availablePlayers);

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

  getAllMatchHistory: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertLeagueMemberOrHost(ctx, input.leagueId);

      const rows = await ctx.db
        .select({
          id: matchHistory.id,
          meetingId: matchHistory.meetingId,
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
        .where(eq(matchHistory.leagueId, input.leagueId))
        .orderBy(asc(matchHistory.meetingNumber), asc(matchHistory.tableNumber));

      const memberIds = [
        ...new Set(
          rows
            .flatMap((r) => [r.player1Id, r.player2Id])
            .filter(Boolean) as string[],
        ),
      ];

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
      }));
    }),
});
