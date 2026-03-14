export { appRouter } from "./routers/index.js";
export type { AppRouter } from "./routers/index.js";
export { createContext } from "./trpc.js";
export type { Context } from "./trpc.js";

import type { inferRouterOutputs, inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "./routers/index.js";
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
