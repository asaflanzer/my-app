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
      prompt: "select_account",
    },
    facebook: {
      clientId: process.env["FACEBOOK_CLIENT_ID"]!,
      clientSecret: process.env["FACEBOOK_CLIENT_SECRET"]!,
    },
    apple: {
      clientId: process.env["APPLE_CLIENT_ID"]!,
      clientSecret: process.env["APPLE_CLIENT_SECRET"]!,
      appBundleIdentifier: process.env["APPLE_APP_BUNDLE_IDENTIFIER"],
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
    ...(process.env["FRONTEND_WEB_URL"] ? [process.env["FRONTEND_WEB_URL"]] : []),
  ],
  advanced: {
    // Use SameSite=None;Secure only when the backend itself is on HTTPS (production).
    // In local dev BETTER_AUTH_URL is http://localhost so cookies stay Lax,
    // which works fine for same-site localhost requests.
    defaultCookieAttributes: process.env["BETTER_AUTH_URL"]?.startsWith("https://")
      ? { sameSite: "none", secure: true }
      : {},
  },
});

export type Auth = typeof auth;
