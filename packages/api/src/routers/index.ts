import { router } from "../trpc.js";
import { authRouter } from "./auth.js";
import { userRouter } from "./user.js";

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
