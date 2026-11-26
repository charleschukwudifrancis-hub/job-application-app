import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSafeApplyUrl } from "@/lib/job-boards";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const application = await prisma.application.findUnique({ where: { id } });
  if (!application) return NextResponse.json({ error: "Application draft was not found." }, { status: 404 });
  if (application.status !== "APPROVED") {
    return NextResponse.json({ error: "Review and explicitly approve this draft before opening the employer page." }, { status: 409 });
  }
  if (!isSafeApplyUrl(application.provider, application.applyUrl)) {
    return NextResponse.json({ error: "The employer application link could not be verified." }, { status: 400 });
  }

  await prisma.application.update({
    where: { id },
    data: { status: "HANDED_OFF", handedOffAt: new Date() },
  });
  return NextResponse.json({ url: application.applyUrl });
}
