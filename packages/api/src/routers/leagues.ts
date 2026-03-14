import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { leagues, leagueMembers, users } from "@my-app/db";
import { eq, and } from "@my-app/db";
import { TRPCError } from "@trpc/server";

function nanoid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env["VITE_ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdminEmail(ctx.session.user.email)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create leagues or tournaments",
        });
      }

      const leagueId = nanoid();
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
        createdAt: now,
        updatedAt: now,
      });

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
          pts: leagueMembers.pts,
          disabled: leagueMembers.disabled,
          joinedAt: leagueMembers.joinedAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(leagueMembers)
        .innerJoin(users, eq(leagueMembers.userId, users.id))
        .where(eq(leagueMembers.leagueId, league.id));

      return {
        ...league,
        members,
        isAdmin: league.hostId === ctx.session.user.id,
        myMemberId: membership?.id,
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
    .input(z.object({ leagueId: z.string(), email: z.string().email() }))
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
        const newUserId = nanoid();
        const name = input.email.split("@")[0] ?? input.email;
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
        id: nanoid(),
        leagueId: input.leagueId,
        userId: user.id,
        wins: 0,
        losses: 0,
        pts: 0,
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
      (l) => l.hostId !== userId && !memberLeagueIds.has(l.id),
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
        id: nanoid(),
        leagueId: input.leagueId,
        userId,
        wins: 0,
        losses: 0,
        pts: 0,
        disabled: true,
        joinedAt: new Date(),
      });

      return { leagueId: input.leagueId };
    }),

  delete: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeagueHost(ctx, input.leagueId);
      await ctx.db.delete(leagues).where(eq(leagues.id, input.leagueId));
    }),
});
