import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/schemas";
import { EMPTY_PROFILE } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await prisma.profile.upsert({
    where: { id: "primary" },
    create: {
      id: "primary",
      ...EMPTY_PROFILE,
      experience: EMPTY_PROFILE.experience as Prisma.InputJsonValue,
      education: EMPTY_PROFILE.education as Prisma.InputJsonValue,
    },
    update: {},
  });
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
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
    where: { id: "primary" },
    create: {
      id: "primary",
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
