import { z } from "zod";
import { router, adminProcedure } from "../trpc.js";
import { users, hosts, leagues } from "@my-app/db";
import { eq, inArray } from "@my-app/db";
import { TRPCError } from "@trpc/server";

export const hostsRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: hosts.id,
        userId: hosts.userId,
        enabled: hosts.enabled,
        name: users.name,
        email: users.email,
      })
      .from(hosts)
      .innerJoin(users, eq(hosts.userId, users.id));

    if (rows.length === 0) return [];

    const userIds = rows.map((r) => r.userId);
    const hostLeagues = await ctx.db
      .select({ id: leagues.id, hostId: leagues.hostId, name: leagues.name })
      .from(leagues)
      .where(inArray(leagues.hostId, userIds));

    const leaguesByUserId = new Map<string, { id: string; name: string }[]>();
    for (const league of hostLeagues) {
      const existing = leaguesByUserId.get(league.hostId) ?? [];
      existing.push({ id: league.id, name: league.name });
      leaguesByUserId.set(league.hostId, existing);
    }

    return rows.map((row) => ({
      ...row,
      leagues: leaguesByUserId.get(row.userId) ?? [],
    }));
  }),

  grant: adminProcedure
    .input(z.object({ email: z.string().email(), name: z.string().trim().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      let [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        const now = new Date();
        const newUserId = crypto.randomUUID();
        const name = input.name ?? input.email.split("@")[0] ?? input.email;
        [user] = await ctx.db
          .insert(users)
          .values({ id: newUserId, name, email: input.email, emailVerified: false, createdAt: now, updatedAt: now })
          .returning();
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
      }

      const [existing] = await ctx.db
        .select()
        .from(hosts)
        .where(eq(hosts.userId, user.id))
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a host" });
      }

      const now = new Date();
      await ctx.db.insert(hosts).values({
        id: crypto.randomUUID(),
        userId: user.id,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });

      if (input.name) {
        await ctx.db
          .update(users)
          .set({ name: input.name, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }
    }),

  revoke: adminProcedure
    .input(z.object({ hostId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [host] = await ctx.db
        .select()
        .from(hosts)
        .where(eq(hosts.id, input.hostId))
        .limit(1);

      if (!host) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.delete(hosts).where(eq(hosts.id, input.hostId));
    }),

  toggleEnabled: adminProcedure
    .input(z.object({ hostId: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [host] = await ctx.db
        .select()
        .from(hosts)
        .where(eq(hosts.id, input.hostId))
        .limit(1);

      if (!host) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(hosts)
        .set({ enabled: input.enabled, updatedAt: new Date() })
        .where(eq(hosts.id, input.hostId));
    }),

  updateName: adminProcedure
    .input(z.object({ userId: z.string(), name: z.string().trim().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(users)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(users.id, input.userId));
    }),
});
