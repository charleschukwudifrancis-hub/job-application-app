import { NextRequest, NextResponse } from "next/server";
import { authenticationRequiredResponse, getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchBoardJobs, searchListings } from "@/lib/job-boards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return authenticationRequiredResponse();
  const query = request.nextUrl.searchParams.get("q")?.slice(0, 120) ?? "";
  const location = request.nextUrl.searchParams.get("location")?.slice(0, 120) ?? "";
  const boards = await prisma.jobBoard.findMany({ where: { active: true, ownerId: userId } });
  if (!boards.length) return NextResponse.json({ jobs: [], errors: [], configuredBoards: 0 });

  const results = await Promise.allSettled(
    boards.map(async (board) => {
      const listings = await fetchBoardJobs(board);
      return listings.map((job) => ({
        ...job,
        provider: board.provider,
        boardId: board.id,
        companyName: board.companyName,
      }));
    }),
  );
  const jobs = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const errors = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [
          {
            companyName: boards[index].companyName,
            message: result.reason instanceof Error ? result.reason.message : "Job source could not be reached.",
          },
        ]
      : [],
  );
  if (errors.length === boards.length) {
    return NextResponse.json(
      { error: "None of the configured employer boards could be reached.", errors, configuredBoards: boards.length },
      { status: 502 },
    );
  }

  return NextResponse.json({
    jobs: searchListings(jobs, query, location),
    errors,
    configuredBoards: boards.length,
    fetchedAt: new Date().toISOString(),
  });
}
