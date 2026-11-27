import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authenticationRequiredResponse, getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/schemas";
import { EMPTY_PROFILE } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return authenticationRequiredResponse();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
  const profile = await prisma.profile.upsert({
    where: { ownerId: userId },
    create: {
      ...EMPTY_PROFILE,
      ownerId: userId,
      name: user.name,
      email: user.email,
      experience: EMPTY_PROFILE.experience as Prisma.InputJsonValue,
      education: EMPTY_PROFILE.education as Prisma.InputJsonValue,
    },
    update: {},
  });
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return authenticationRequiredResponse();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the CV fields and try again." }, { status: 400 });
  }

  const profile = await prisma.profile.upsert({
    where: { ownerId: userId },
    create: {
      ownerId: userId,
      ...parsed.data,
      experience: parsed.data.experience as Prisma.InputJsonValue,
      education: parsed.data.education as Prisma.InputJsonValue,
    },
    update: {
      ...parsed.data,
      experience: parsed.data.experience as Prisma.InputJsonValue,
      education: parsed.data.education as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json(profile);
}
