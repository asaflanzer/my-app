import { router } from "../trpc.js";
import { authRouter } from "./auth.js";
import { userRouter } from "./user.js";
import { tournamentRouter } from "./tournaments.js";
import { leagueRouter } from "./leagues.js";
import { meetingRouter } from "./meetings.js";
import { contactRouter } from "./contact.js";

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  tournament: tournamentRouter,
  league: leagueRouter,
  meeting: meetingRouter,
  contact: contactRouter,
});

export type AppRouter = typeof appRouter;
