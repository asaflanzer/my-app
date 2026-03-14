import { router } from "../trpc.js";
import { authRouter } from "./auth.js";
import { userRouter } from "./user.js";
import { tournamentRouter } from "./tournaments.js";

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  tournament: tournamentRouter,
});

export type AppRouter = typeof appRouter;
