import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.PROD
    ? "/api/auth"
    : "http://localhost:3001/api/auth",
});

export const { signIn, signOut, useSession } = authClient;
