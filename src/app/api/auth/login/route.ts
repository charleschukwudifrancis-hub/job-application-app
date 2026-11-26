import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedPassword = process.env.APP_PASSWORD;
  if (!expectedPassword) {
    return NextResponse.json({ error: "Set APP_PASSWORD before signing in." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const password = body && typeof body === "object" ? (body as { password?: unknown }).password : undefined;
  if (typeof password !== "string" || password.length > 512) {
    return NextResponse.json({ error: "Enter the workspace password." }, { status: 400 });
  }

  const supplied = Buffer.from(password);
  const expected = Buffer.from(expectedPassword);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
  }

  try {
    const token = await createSessionToken();
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(sessionCookie.name, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionCookie.maxAge,
    });
    return response;
  } catch (error) {
    console.error("Could not create session.", error);
    return NextResponse.json({ error: "Authentication is not configured correctly." }, { status: 503 });
  }
}
