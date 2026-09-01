import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const passcode = process.env.APP_PASSCODE;
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;

  if (passcode && cookie && cookie === (await passcodeToken(passcode))) {
    return NextResponse.next();
  }

  // The deployed URL can trigger real emails, so an unconfigured passcode locks
  // the app rather than opening it.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
