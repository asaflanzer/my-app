import { publicProcedure, protectedProcedure, router } from "../trpc.js";

export const authRouter = router({
  session: publicProcedure.query(({ ctx }) => {
    return ctx.session ?? null;
  }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    // Better Auth handles sign-out via HTTP endpoint; this is a tRPC wrapper
    return { success: true };
  }),
});
