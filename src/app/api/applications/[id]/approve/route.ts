import { NextResponse } from "next/server";
import { authenticationRequiredResponse, getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transitionDraft } from "@/lib/application-workflow";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return authenticationRequiredResponse();
  const { id } = await params;
  const [application, profile] = await Promise.all([
    prisma.application.findFirst({ where: { id, ownerId: userId } }),
    prisma.profile.findUnique({ where: { ownerId: userId } }),
  ]);
  if (!application || !profile) return NextResponse.json({ error: "Draft or CV profile was not found." }, { status: 404 });
  if (!profile.name.trim() || !profile.email.trim()) {
    return NextResponse.json({ error: "Add your name and email to your CV before approving." }, { status: 409 });
  }
  const nextStatus = transitionDraft(application.status, "approve");
  if (!nextStatus) return NextResponse.json({ error: "Only an editable draft can be approved." }, { status: 409 });
  if (!application.tailoredCv) return NextResponse.json({ error: "Add or generate a CV draft before approving." }, { status: 409 });

  const approved = await prisma.application.update({
    where: { id, ownerId: userId },
    data: { status: nextStatus, approvedAt: new Date() },
  });
  return NextResponse.json({ application: approved });
}
