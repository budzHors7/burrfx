import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function getSetCookies(headers: Headers) {
  const cookieHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };

  return (
    cookieHeaders.getSetCookie?.() ?? [headers.get("set-cookie")].filter(Boolean)
  );
}

export async function GET(request: Request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("origin", new URL(request.url).origin);

  const signOutResponse = await auth.handler(
    new Request(new URL("/api/auth/sign-out", request.url), {
      headers: requestHeaders,
      method: "POST",
    }),
  );

  const response = NextResponse.redirect(new URL("/auth", request.url));

  for (const cookie of getSetCookies(signOutResponse.headers)) {
    response.headers.append("set-cookie", cookie);
  }

  response.cookies.set("burrfx_session", "", { maxAge: 0, path: "/" });

  return response;
}
