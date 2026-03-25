import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { leagues, leagueMembers, leagueTables, users, hosts, meetings, matchHistory } from "@my-app/db";
import { eq, and, asc, inArray } from "@my-app/db";
import { TRPCError } from "@trpc/server";

async function assertLeagueHost(
  ctx: {
    db: typeof import("@my-app/db").db;
    session: { user: { id: string } };
  },
  leagueId: string,
) {
  const [league] = await ctx.db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);
  if (!league) throw new TRPCError({ code: "NOT_FOUND" });
  if (league.hostId !== ctx.session.user.id)
    throw new TRPCError({ code: "FORBIDDEN" });
  return league;
}

export const leagueRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z
          .string()
          .min(1)
          .regex(
            /^[a-z0-9-]+$/,
            "Slug must be lowercase letters, numbers, and hyphens",
          ),
        startDate: z.string().optional(),
        startTime: z.string().default("19:00"),
        regularMeetings: z.number().int().positive().default(7),
        playoffMeetings: z.number().int().positive().default(2),
        maxPlayers: z.number().int().positive().default(32),
        raceTo8ball: z.number().int().positive().default(3),
        raceTo9ball: z.number().int().positive().default(7),
        numberOfTables: z.number().int().positive().default(15),
        firstTableNumber: z.number().int().positive().default(10),
        isPublic: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.isAdmin) {
        const [host] = await ctx.db
          .select({ enabled: hosts.enabled })
          .from(hosts)
          .where(eq(hosts.userId, ctx.session.user.id))
          .limit(1);
        if (!host?.enabled) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to create leagues",
          });
        }
      }
      const leagueId = crypto.randomUUID();
      const now = new Date();

      await ctx.db.insert(leagues).values({
        id: leagueId,
        hostId: ctx.session.user.id,
        name: input.name,
        slug: input.slug,
        startDate: input.startDate ?? null,
        startTime: input.startTime,
        regularMeetings: input.regularMeetings,
        playoffMeetings: input.playoffMeetings,
        maxPlayers: input.maxPlayers,
        raceTo8ball: input.raceTo8ball,
        raceTo9ball: input.raceTo9ball,
        numberOfTables: input.numberOfTables,
        firstTableNumber: input.firstTableNumber,
        isPublic: input.isPublic,
        createdAt: now,
        updatedAt: now,
      });

      // Seed tables based on numberOfTables and firstTableNumber
      await ctx.db.insert(leagueTables).values(
        Array.from({ length: input.numberOfTables }, (_, i) => ({
          id: crypto.randomUUID(),
          leagueId,
          tableNumber: i + input.firstTableNumber,
        })),
      );

      return { id: leagueId, slug: input.slug };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const memberRows = await ctx.db
      .select({ league: leagues })
      .from(leagueMembers)
      .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
      .where(eq(leagueMembers.userId, userId));

    const hostedRows = await ctx.db
      .select({ league: leagues })
      .from(leagues)
      .where(eq(leagues.hostId, userId));

    const all = [
      ...memberRows.map((r) => r.league),
      ...hostedRows.map((r) => r.league),
    ];
    const seen = new Set<string>();
    return all.filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });
  }),

  getById: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Accept id or slug
      const [league] = await ctx.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (!league) throw new TRPCError({ code: "NOT_FOUND" });

      const isHost = league.hostId === ctx.session.user.id;

      // Verify caller is a member or the host
      const [membership] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, league.id),
            eq(leagueMembers.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!membership && !isHost) throw new TRPCError({ code: "FORBIDDEN" });

      // Fetch all members with their user names
      const members = await ctx.db
        .select({
          id: leagueMembers.id,
          userId: leagueMembers.userId,
          leagueId: leagueMembers.leagueId,
          wins: leagueMembers.wins,
          losses: leagueMembers.losses,
          games: leagueMembers.games,
          score: leagueMembers.score,
          disabled: leagueMembers.disabled,
          isQualified: leagueMembers.isQualified,
          joinedAt: leagueMembers.joinedAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(leagueMembers)
        .innerJoin(users, eq(leagueMembers.userId, users.id))
        .where(eq(leagueMembers.leagueId, league.id));

      const firstMeeting = await ctx.db
        .select({ id: meetings.id })
        .from(meetings)
        .where(eq(meetings.leagueId, league.id))
        .limit(1);

      return {
        ...league,
        members,
        isAdmin: league.hostId === ctx.session.user.id,
        myMemberId: membership?.id,
        hasStarted: firstMeeting.length > 0,
      };
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        leagueId: z.string(),
        name: z.string().min(1).optional(),
        startDate: z.string().nullable().optional(),
        startTime: z.string().optional(),
        regularMeetings: z.number().int().positive().optional(),
        playoffMeetings: z.number().int().positive().optional(),
        maxPlayers: z.number().int().positive().optional(),
        raceTo8ball: z.number().int().positive().optional(),
        raceTo9ball: z.number().int().positive().optional(),
        numberOfTables: z.number().int().positive().optional(),
        firstTableNumber: z.number().int().positive().optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { leagueId, ...fields } = input;
      await assertLeagueHost(ctx, leagueId);

      await ctx.db
        .update(leagues)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(leagues.id, leagueId));
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        leagueId: z.string(),
        name: z.string().min(1),
        email: z
          .string()
          .email()
          .refine((e) => e.toLowerCase().endsWith("@gmail.com"), {
            message: "Email must be a Gmail address",
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      // Find user by email — create one if they haven't signed up yet
      let [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        const now = new Date();
        const newUserId = crypto.randomUUID();
        const name = input.name;
        await ctx.db.insert(users).values({
          id: newUserId,
          name,
          email: input.email,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        });
        [user] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.id, newUserId))
          .limit(1);
      }

      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check not already a member
      const [existing] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, user.id),
          ),
        )
        .limit(1);
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member",
        });

      await ctx.db.insert(leagueMembers).values({
        id: crypto.randomUUID(),
        leagueId: input.leagueId,
        userId: user.id,
        wins: 0,
        losses: 0,
        score: 0,
        disabled: false,
        joinedAt: new Date(),
      });
    }),

  removeMember: protectedProcedure
    .input(z.object({ leagueId: z.string(), memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      // Prevent removing the host
      const [member] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.id, input.memberId),
            eq(leagueMembers.leagueId, input.leagueId),
          ),
        )
        .limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .delete(leagueMembers)
        .where(eq(leagueMembers.id, input.memberId));
    }),

  toggleDisabled: protectedProcedure
    .input(z.object({ leagueId: z.string(), memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      const [member] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.id, input.memberId),
            eq(leagueMembers.leagueId, input.leagueId),
          ),
        )
        .limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(leagueMembers)
        .set({ disabled: !member.disabled })
        .where(eq(leagueMembers.id, input.memberId));

      // Recalculate all stats for the league based on updated disabled statuses
      const allMatches = await ctx.db
        .select()
        .from(matchHistory)
        .where(eq(matchHistory.leagueId, input.leagueId));

      const allMembers = await ctx.db
        .select({ id: leagueMembers.id, disabled: leagueMembers.disabled })
        .from(leagueMembers)
        .where(eq(leagueMembers.leagueId, input.leagueId));

      await ctx.db
        .update(leagueMembers)
        .set({ wins: 0, losses: 0, games: 0, score: 0 })
        .where(eq(leagueMembers.leagueId, input.leagueId));

      if (allMatches.length > 0) {
        const disabledSet = new Set(allMembers.filter((m) => m.disabled).map((m) => m.id));
        const deltas = new Map<string, { wins: number; losses: number; games: number; score: number }>();
        const getDelta = (id: string) => {
          if (!deltas.has(id)) deltas.set(id, { wins: 0, losses: 0, games: 0, score: 0 });
          return deltas.get(id)!;
        };

        for (const match of allMatches) {
          const p1 = match.player1Id;
          const p2 = match.player2Id;
          if (!p1 || !p2 || !match.winnerId) continue;
          // Mixed match (one active, one inactive) → skip both players
          if (disabledSet.has(p1) !== disabledSet.has(p2)) continue;

          const d1 = getDelta(p1);
          d1.games += 1;
          if (match.winnerId === p1) { d1.wins += 1; d1.score += match.score1 - match.score2; }
          else { d1.losses += 1; d1.score += match.score1 - match.score2; }

          const d2 = getDelta(p2);
          d2.games += 1;
          if (match.winnerId === p2) { d2.wins += 1; d2.score += match.score2 - match.score1; }
          else { d2.losses += 1; d2.score += match.score2 - match.score1; }
        }

        for (const [memberId, delta] of deltas) {
          if (delta.games === 0) continue;
          await ctx.db
            .update(leagueMembers)
            .set({ wins: delta.wins, losses: delta.losses, games: delta.games, score: delta.score })
            .where(eq(leagueMembers.id, memberId));
        }
      }
    }),

  toggleQualified: protectedProcedure
    .input(z.object({ leagueId: z.string(), memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);

      const [member] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.id, input.memberId),
            eq(leagueMembers.leagueId, input.leagueId),
          ),
        )
        .limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(leagueMembers)
        .set({ isQualified: !member.isQualified })
        .where(eq(leagueMembers.id, input.memberId));
    }),

  listAvailable: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const memberships = await ctx.db
      .select({ leagueId: leagueMembers.leagueId })
      .from(leagueMembers)
      .where(eq(leagueMembers.userId, userId));

    const memberLeagueIds = new Set(memberships.map((m) => m.leagueId));

    const all = await ctx.db.select().from(leagues);
    return all.filter(
      (l) => l.isPublic && l.hostId !== userId && !memberLeagueIds.has(l.id),
    );
  }),

  signUp: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [league] = await ctx.db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);
      if (!league) throw new TRPCError({ code: "NOT_FOUND" });
      if (league.hostId === userId)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Host cannot sign up as a player",
        });

      const [existing] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, userId),
          ),
        )
        .limit(1);
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Already signed up for this league",
        });

      await ctx.db.insert(leagueMembers).values({
        id: crypto.randomUUID(),
        leagueId: input.leagueId,
        userId,
        wins: 0,
        losses: 0,
        score: 0,
        disabled: true,
        joinedAt: new Date(),
      });

      return { leagueId: input.leagueId };
    }),

  leave: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [member] = await ctx.db
        .select()
        .from(leagueMembers)
        .where(
          and(
            eq(leagueMembers.leagueId, input.leagueId),
            eq(leagueMembers.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(leagueMembers).where(eq(leagueMembers.id, member.id));
    }),

  delete: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);
      await ctx.db.delete(leagues).where(eq(leagues.id, input.leagueId));
    }),

  listTables: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .query(async ({ ctx, input }) => {
      const league = await assertLeagueHost(ctx, input.leagueId);
      const existing = await ctx.db
        .select()
        .from(leagueTables)
        .where(eq(leagueTables.leagueId, input.leagueId))
        .orderBy(asc(leagueTables.tableNumber));

      if (existing.length > 0) return existing;

      // Auto-seed tables using league's numberOfTables and firstTableNumber
      const rows = Array.from({ length: league.numberOfTables }, (_, i) => ({
        id: crypto.randomUUID(),
        leagueId: input.leagueId,
        tableNumber: i + league.firstTableNumber,
      }));
      await ctx.db.insert(leagueTables).values(rows);
      return ctx.db
        .select()
        .from(leagueTables)
        .where(eq(leagueTables.leagueId, input.leagueId))
        .orderBy(asc(leagueTables.tableNumber));
    }),

  initializeTables: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const league = await assertLeagueHost(ctx, input.leagueId);
      await ctx.db.delete(leagueTables).where(eq(leagueTables.leagueId, input.leagueId));
      await ctx.db.insert(leagueTables).values(
        Array.from({ length: league.numberOfTables }, (_, i) => ({
          id: crypto.randomUUID(),
          leagueId: input.leagueId,
          tableNumber: i + league.firstTableNumber,
        })),
      );
    }),

  addTable: protectedProcedure
    .input(z.object({ leagueId: z.string(), tableNumber: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);
      await ctx.db.insert(leagueTables).values({
        id: crypto.randomUUID(),
        leagueId: input.leagueId,
        tableNumber: input.tableNumber,
      });
    }),

  updateTable: protectedProcedure
    .input(z.object({ leagueId: z.string(), tableId: z.string(), tableNumber: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);
      await ctx.db
        .update(leagueTables)
        .set({ tableNumber: input.tableNumber })
        .where(and(eq(leagueTables.id, input.tableId), eq(leagueTables.leagueId, input.leagueId)));
    }),

  removeTable: protectedProcedure
    .input(z.object({ leagueId: z.string(), tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);
      await ctx.db
        .delete(leagueTables)
        .where(and(eq(leagueTables.id, input.tableId), eq(leagueTables.leagueId, input.leagueId)));
    }),

  listWithStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const memberRows = await ctx.db
      .select({ league: leagues })
      .from(leagueMembers)
      .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
      .where(eq(leagueMembers.userId, userId));

    const hostedRows = await ctx.db
      .select({ league: leagues })
      .from(leagues)
      .where(eq(leagues.hostId, userId));

    const all = [
      ...memberRows.map((r) => r.league),
      ...hostedRows.map((r) => r.league),
    ];
    const seen = new Set<string>();
    const userLeagues = all.filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    });

    if (userLeagues.length === 0) return [];

    const leagueIds = userLeagues.map((l) => l.id);
    const meetingRows = await ctx.db
      .select({ leagueId: meetings.leagueId, status: meetings.status })
      .from(meetings)
      .where(inArray(meetings.leagueId, leagueIds));

    const meetingsByLeague = new Map<string, string[]>();
    for (const m of meetingRows) {
      const list = meetingsByLeague.get(m.leagueId) ?? [];
      list.push(m.status);
      meetingsByLeague.set(m.leagueId, list);
    }

    return userLeagues.map((l) => {
      const statuses = meetingsByLeague.get(l.id) ?? [];
      let status: "active" | "done" | "not_started";
      if (statuses.length === 0) {
        status = "not_started";
      } else {
        const expected = l.regularMeetings + l.playoffMeetings;
        const doneCount = statuses.filter((s) => s === "done").length;
        status = doneCount >= expected ? "done" : "active";
      }
      return { ...l, status };
    });
  }),
});
