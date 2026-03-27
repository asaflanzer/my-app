import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { users, eq, asc } from "@my-app/db";
import { adminProcedure, router } from "../trpc.js";

export const adminRouter = router({
  listUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        isActive: users.isActive,
        isHost: users.isHost,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt));
  }),

  toggleActive: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({ isActive: users.isActive })
        .from(users)
        .where(eq(users.id, input.userId));
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const [updated] = await ctx.db
        .update(users)
        .set({ isActive: !user.isActive, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning();
      return updated;
    }),

  toggleHost: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({ isHost: users.isHost })
        .from(users)
        .where(eq(users.id, input.userId));
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const [updated] = await ctx.db
        .update(users)
        .set({ isHost: !user.isHost, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning();
      return updated;
    }),
});
