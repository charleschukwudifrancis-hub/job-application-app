import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, readSessionUserId, sessionCookie } from "@/lib/session";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return readSessionUserId(cookieStore.get(sessionCookie.name)?.value);
}

export async function createAuthenticatedResponse(userId: string): Promise<NextResponse> {
  const token = await createSessionToken(userId);
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(sessionCookie.name, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookie.maxAge,
  });
  return response;
}

export function authenticationRequiredResponse(): NextResponse {
  return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
}
