import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedResponse } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { registerAccountSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = registerAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your account details and try again." }, { status: 400 });
  }

  try {
    const { password, ...account } = parsed.data;
    const user = await prisma.user.create({
      data: {
        ...account,
        passwordHash: await hashPassword(password),
      },
      select: { id: true },
    });
    return await createAuthenticatedResponse(user.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists. Try signing in instead." }, { status: 409 });
    }
    console.error("Could not register account.", error);
    return NextResponse.json({ error: "Account creation is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
