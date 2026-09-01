import { NextResponse } from "next/server";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

export async function POST(req: Request) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) {
    return NextResponse.json(
      { error: "APP_PASSCODE is not configured on the server." },
      { status: 500 },
    );
  }

  const { passcode: submitted } = (await req.json()) as { passcode?: string };
  if (!submitted || submitted !== passcode) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await passcodeToken(passcode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
