import { publicProcedure, protectedProcedure, router } from "../trpc.js";

export const authRouter = router({
  session: publicProcedure.query(({ ctx }) => {
    return ctx.session ?? null;
  }),

  signOut: protectedProcedure.mutation(async () => {
    // Better Auth handles sign-out via its HTTP endpoint; this is a tRPC convenience wrapper
    return { success: true };
  }),
});
