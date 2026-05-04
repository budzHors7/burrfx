import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function redirectWithError(request: NextRequest, error: string) {
  const url = new URL("/auth", request.url);
  url.searchParams.set("error", error);

  return NextResponse.redirect(url);
}

function getSetCookies(headers: Headers) {
  const cookieHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };

  return (
    cookieHeaders.getSetCookie?.() ?? [headers.get("set-cookie")].filter(Boolean)
  );
}

export async function GET(request: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return redirectWithError(request, "missing_google_config");
  }

  try {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("origin", request.nextUrl.origin);

    const { headers, response: body } = await auth.api.signInSocial({
      body: {
        callbackURL: "/dashboard",
        errorCallbackURL: "/auth?error=google_auth_failed",
        newUserCallbackURL: "/dashboard",
        provider: "google",
      },
      headers: requestHeaders,
      returnHeaders: true,
    });

    if (!body.url) {
      return redirectWithError(request, "google_auth_failed");
    }

    const response = NextResponse.redirect(body.url);

    for (const cookie of getSetCookies(headers)) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  } catch {
    return redirectWithError(request, "google_auth_failed");
  }
}
