import { NextResponse } from "next/server";
import { authenticationRequiredResponse, getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSafeApplyUrl } from "@/lib/job-boards";
import { transitionDraft } from "@/lib/application-workflow";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return authenticationRequiredResponse();
  const { id } = await params;
  const application = await prisma.application.findFirst({ where: { id, ownerId: userId } });
  if (!application) return NextResponse.json({ error: "Application draft was not found." }, { status: 404 });
  const nextStatus = transitionDraft(application.status, "handoff");
  if (!nextStatus) {
    return NextResponse.json({ error: "Review and explicitly approve this draft before opening the employer page." }, { status: 409 });
  }
  if (!isSafeApplyUrl(application.provider, application.applyUrl)) {
    return NextResponse.json({ error: "The employer application link could not be verified." }, { status: 400 });
  }

  await prisma.application.update({
    where: { id, ownerId: userId },
    data: { status: nextStatus, handedOffAt: new Date() },
  });
  return NextResponse.json({ url: application.applyUrl });
}
