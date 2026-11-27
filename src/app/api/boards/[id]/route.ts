import { NextResponse } from "next/server";
import { authenticationRequiredResponse, getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return authenticationRequiredResponse();
  const { id } = await params;
  const deleted = await prisma.jobBoard.deleteMany({ where: { id, ownerId: userId } });
  if (deleted.count === 0) return NextResponse.json({ error: "Employer board was not found." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
