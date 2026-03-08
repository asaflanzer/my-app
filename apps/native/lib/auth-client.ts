import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost:3000",
});

export const { signIn, signOut, useSession } = authClient;
