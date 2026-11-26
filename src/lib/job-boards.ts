import { decode } from "he";
import type { BoardProvider } from "@/lib/types";

export type BoardListing = {
  id: string;
  title: string;
  location: string;
  description: string;
  applyUrl: string;
  updatedAt: string | null;
};

type BoardConfig = {
  id: string;
  provider: BoardProvider;
  companyName: string;
  slug: string;
};

function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return decode(decode(value))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeGreenhouse(payload: unknown): BoardListing[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { jobs?: unknown }).jobs)) {
    throw new Error("Greenhouse returned an unexpected job list.");
  }

  return (payload as { jobs: Record<string, unknown>[] }).jobs.flatMap((job) => {
    if (typeof job.id !== "number" && typeof job.id !== "string") return [];
    const location =
      job.location && typeof job.location === "object"
        ? (job.location as { name?: unknown }).name
        : "";
    return [
      {
        id: String(job.id),
        title: typeof job.title === "string" ? plainText(job.title) : "",
        location: typeof location === "string" ? plainText(location) : "",
        description: plainText(job.content),
        applyUrl: "",
        updatedAt: typeof job.updated_at === "string" ? job.updated_at : null,
      },
    ];
  });
}

export function normalizeLever(payload: unknown): BoardListing[] {
  if (!Array.isArray(payload)) throw new Error("Lever returned an unexpected job list.");

  return payload.flatMap((job: Record<string, unknown>) => {
    if (typeof job.id !== "string" || typeof job.text !== "string") return [];
    const categories =
      job.categories && typeof job.categories === "object"
        ? (job.categories as Record<string, unknown>)
        : {};
    const urls = job.urls && typeof job.urls === "object" ? (job.urls as Record<string, unknown>) : {};
    const description = typeof job.descriptionPlain === "string" ? job.descriptionPlain : job.description;
    return [
      {
        id: job.id,
        title: plainText(job.text),
        location: typeof categories.location === "string" ? plainText(categories.location) : "",
        description: plainText(description),
        applyUrl: typeof urls.apply === "string" ? urls.apply : "",
        updatedAt: typeof job.createdAt === "number" ? new Date(job.createdAt).toISOString() : null,
      },
    ];
  });
}

export function isSafeApplyUrl(provider: BoardProvider, value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (provider === "GREENHOUSE") {
      return url.hostname === "boards.greenhouse.io" && /^\/[a-z0-9-]+\/jobs\/\d+/.test(url.pathname);
    }
    return (
      (url.hostname === "jobs.lever.co" || url.hostname === "jobs.eu.lever.co") &&
      /^\/[a-z0-9-]+\/[a-z0-9-]+/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export async function fetchBoardJobs(board: BoardConfig): Promise<BoardListing[]> {
  const endpoint =
    board.provider === "GREENHOUSE"
      ? `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.slug)}/jobs?content=true`
      : `https://api.lever.co/v0/postings/${encodeURIComponent(board.slug)}?mode=json`;
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": "CareerDesk/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(`${board.companyName} returned HTTP ${response.status}.`);
  }
  const payload: unknown = await response.json();
  const listings = board.provider === "GREENHOUSE" ? normalizeGreenhouse(payload) : normalizeLever(payload);

  return listings.flatMap((job) => {
    const applyUrl =
      board.provider === "GREENHOUSE"
        ? `https://boards.greenhouse.io/${encodeURIComponent(board.slug)}/jobs/${encodeURIComponent(job.id)}`
        : job.applyUrl;
    if (!job.title || !job.description || !isSafeApplyUrl(board.provider, applyUrl)) return [];
    return [{ ...job, applyUrl }];
  });
}

export function searchListings(
  listings: Array<BoardListing & { companyName: string; provider: BoardProvider; boardId: string }>,
  query: string,
  location: string,
) {
  const terms = query.toLowerCase().trim();
  const place = location.toLowerCase().trim();
  return listings.filter((job) => {
    const matchesText =
      !terms ||
      `${job.title} ${job.companyName} ${job.description}`.toLowerCase().includes(terms);
    const matchesLocation = !place || job.location.toLowerCase().includes(place);
    return matchesText && matchesLocation;
  });
}
