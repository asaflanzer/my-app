import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@my-app/auth";
import { db } from "@my-app/db";

export const createContext = async ({ req }: { req: Request }) => {
  const session = await auth.api
    .getSession({ headers: req.headers })
    .catch(() => null);

  return { session, db };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

const isAuthenticated = middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
