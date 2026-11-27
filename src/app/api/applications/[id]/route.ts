import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authenticationRequiredResponse, getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationEditSchema } from "@/lib/schemas";
import { transitionDraft } from "@/lib/application-workflow";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return authenticationRequiredResponse();
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = applicationEditSchema.safeParse(body);
  if (!parsed.success || (!parsed.data.tailoredCv && parsed.data.coverLetter === undefined)) {
    return NextResponse.json({ error: "No valid draft changes were provided." }, { status: 400 });
  }

  const current = await prisma.application.findFirst({ where: { id, ownerId: userId } });
  if (!current) return NextResponse.json({ error: "Application draft was not found." }, { status: 404 });
  const nextStatus = transitionDraft(current.status, "edit");
  if (!nextStatus) return NextResponse.json({ error: "This draft has already been handed off to the employer site." }, { status: 409 });

  const application = await prisma.application.update({
    where: { id, ownerId: userId },
    data: {
      ...(parsed.data.tailoredCv
        ? { tailoredCv: parsed.data.tailoredCv as Prisma.InputJsonValue }
        : {}),
      ...(parsed.data.coverLetter !== undefined ? { coverLetter: parsed.data.coverLetter } : {}),
      status: nextStatus,
      approvedAt: null,
    },
  });
  return NextResponse.json({ application });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return authenticationRequiredResponse();
  const { id } = await params;
  const deleted = await prisma.application.deleteMany({ where: { id, ownerId: userId, status: { not: "HANDED_OFF" } } });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Draft was not found or was already handed off." }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
