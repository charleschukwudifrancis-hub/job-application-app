import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema } from "@/lib/schemas";
import { isSafeApplyUrl } from "@/lib/job-boards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const applications = await prisma.application.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = createApplicationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "The selected job details are incomplete." }, { status: 400 });
  if (!isSafeApplyUrl(parsed.data.provider, parsed.data.applyUrl)) {
    return NextResponse.json({ error: "The employer application link is not a trusted job-board URL." }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: "primary" } });
  if (!profile || !profile.name || !profile.email) {
    return NextResponse.json({ error: "Add your name and email to your CV before drafting an application." }, { status: 409 });
  }

  const application = await prisma.application.create({
    data: {
      ...parsed.data,
      tailoredCv: {
        headline: profile.headline,
        summary: profile.summary,
        skills: profile.skills,
        experience: profile.experience,
      } as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json({ application }, { status: 201 });
}
