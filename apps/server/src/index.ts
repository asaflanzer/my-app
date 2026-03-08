import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@my-app/auth";
import { appRouter, createContext } from "@my-app/api";

const app = new Hono();

// Logging
app.use("*", logger());

// CORS — allow the Vite dev server and any configured origin
const allowedOrigins = [
  "http://localhost:5173",
  process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
].filter(Boolean);

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// Better Auth — handles all /api/auth/* routes (OAuth redirects, callbacks, sessions)
app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));

// tRPC
app.use("/trpc/*", (c) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: ({ req }) => createContext({ req }),
  }),
);

// Health check
app.get("/health", (c) => c.json({ ok: true }));

const port = parseInt(process.env["PORT"] ?? "3000");

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Better Auth:  http://localhost:${port}/api/auth`);
  console.log(`tRPC:         http://localhost:${port}/trpc`);
});
