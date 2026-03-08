import { z } from "zod";
import { eq } from "@my-app/db";
import { users } from "@my-app/db";
import { protectedProcedure, router } from "../trpc.js";

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
    });
    return user ?? null;
  }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          updatedAt: new Date(),
          ...(input.name !== undefined ? { name: input.name } : {}),
        })
        .where(eq(users.id, ctx.session.user.id))
        .returning();
      return updated;
    }),
});
