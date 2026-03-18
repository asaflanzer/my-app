import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, users, accounts, sessions, verifications } from "@my-app/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, account: accounts, session: sessions, verification: verifications },
  }),
  socialProviders: {
    google: {
      clientId: process.env["GOOGLE_CLIENT_ID"]!,
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"]!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
  },
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    ...(process.env["FRONTEND_URL"] ? [process.env["FRONTEND_URL"]] : []),
  ],
  advanced: {
    // Cross-origin setup (Vercel frontend → Railway backend):
    // cookies must be SameSite=None;Secure so the browser stores them
    // from cross-origin fetch responses and sends them on the OAuth callback.
    // Fall back to Lax in local dev (no FRONTEND_URL set, plain HTTP).
    defaultCookieAttributes: process.env["FRONTEND_URL"]
      ? { sameSite: "none", secure: true }
      : {},
  },
});

export type Auth = typeof auth;
