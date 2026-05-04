import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";

const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
].filter((origin): origin is string => Boolean(origin));

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          prompt: "select_account" as const,
        },
      }
    : undefined;

export const auth = betterAuth({
  appName: "BurrFx",
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    process.env.BETTER_AUTH_API_KEY ??
    process.env.AUTH_SECRET,
  socialProviders: googleProvider,
  trustedOrigins,
  account: {
    encryptOAuthTokens: true,
    storeAccountCookie: true,
    storeStateStrategy: "cookie",
  },
  rateLimit: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
  },
  plugins: [
    ...(process.env.BETTER_AUTH_API_KEY
      ? [
          dash({
            apiKey: process.env.BETTER_AUTH_API_KEY,
          }),
        ]
      : []),
    nextCookies(),
  ],
});

export type BurrFxSession = typeof auth.$Infer.Session;

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
