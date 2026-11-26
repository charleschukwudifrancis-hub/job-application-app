import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { boardSchema } from "@/lib/schemas";
import { fetchBoardJobs } from "@/lib/job-boards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const boards = await prisma.jobBoard.findMany({ orderBy: { companyName: "asc" } });
  return NextResponse.json({ boards });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = boardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid employer board." }, { status: 400 });
  }

  try {
    await fetchBoardJobs({ id: "validation", ...parsed.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The employer board could not be verified.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    const board = await prisma.jobBoard.create({ data: parsed.data });
    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That employer board is already in your list." }, { status: 409 });
    }
    throw error;
  }
}
