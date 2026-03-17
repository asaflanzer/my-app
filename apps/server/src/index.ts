import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { MiddlewareHandler } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { auth } from "@my-app/auth";
import { appRouter, createContext } from "@my-app/api";

const app = new Hono();

// Logging
app.use("*", logger());

// CORS — allow the Vite dev server and any configured origin
// Normalize to strip trailing slashes so env var formatting doesn't matter
const normalizeOrigin = (url: string) => url.replace(/\/$/, "");
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  normalizeOrigin(process.env["BETTER_AUTH_URL"] ?? "http://localhost:3001"),
  ...(process.env["FRONTEND_URL"]
    ? [normalizeOrigin(process.env["FRONTEND_URL"])]
    : []),
];

console.log("Allowed CORS origins:", allowedOrigins);

app.use(
  "*",
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// Disable caching for all API/tRPC routes — rebuilds the Response explicitly so the header
// is guaranteed to apply even to raw Response objects from better-auth and tRPC handlers.
const noCacheMiddleware: MiddlewareHandler = async (c, next) => {
  await next();
  if (c.res) {
    const headers = new Headers(c.res.headers);
    headers.set("Cache-Control", "no-store");
    c.res = new Response(c.res.body, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers,
    });
  }
};
app.use("/api/*", noCacheMiddleware);
app.use("/trpc/*", noCacheMiddleware);

// Better Auth — handles all /api * routes (OAuth redirects, callbacks, sessions)
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

const port = parseInt(process.env["PORT"] ?? "3001");

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Better Auth:  http://localhost:${port}/api/auth`);
  console.log(`tRPC:         http://localhost:${port}/trpc`);
});
