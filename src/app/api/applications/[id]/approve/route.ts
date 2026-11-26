import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [application, profile] = await Promise.all([
    prisma.application.findUnique({ where: { id } }),
    prisma.profile.findUnique({ where: { id: "primary" } }),
  ]);
  if (!application || !profile) return NextResponse.json({ error: "Draft or CV profile was not found." }, { status: 404 });
  if (!profile.name.trim() || !profile.email.trim()) {
    return NextResponse.json({ error: "Add your name and email to your CV before approving." }, { status: 409 });
  }
  if (application.status !== "DRAFT") return NextResponse.json({ error: "Only an editable draft can be approved." }, { status: 409 });
  if (!application.tailoredCv) return NextResponse.json({ error: "Add or generate a CV draft before approving." }, { status: 409 });

  const approved = await prisma.application.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  return NextResponse.json({ application: approved });
}
