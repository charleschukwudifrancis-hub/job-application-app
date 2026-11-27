import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticationRequiredResponse, getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/schemas";
import type { CvProfile, ExperienceItem } from "@/lib/types";

export const runtime = "nodejs";

const generatedSchema = z.object({
  headline: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(3000),
  skills: z.array(z.string().trim().min(1).max(80)).max(80),
  experience: z.array(z.object({ bullets: z.array(z.string().trim().min(1).max(500)).max(12) })).max(20),
  coverLetter: z.string().trim().min(1).max(8000),
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return authenticationRequiredResponse();
  const { id } = await params;
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Add AI_API_KEY to the server environment to enable tailoring." }, { status: 503 });

  const [application, profileRecord] = await Promise.all([
    prisma.application.findFirst({ where: { id, ownerId: userId } }),
    prisma.profile.findUnique({ where: { ownerId: userId } }),
  ]);
  if (!application) return NextResponse.json({ error: "Application draft was not found." }, { status: 404 });
  if (application.status !== "DRAFT") {
    return NextResponse.json({ error: "Reopen this draft for editing before generating new suggestions." }, { status: 409 });
  }
  if (!profileRecord) return NextResponse.json({ error: "Complete your CV before tailoring an application." }, { status: 409 });

  const profileResult = profileSchema.safeParse(profileRecord);
  if (!profileResult.success) return NextResponse.json({ error: "Saved CV data could not be read." }, { status: 500 });
  const profile = profileResult.data as CvProfile;

  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  let endpoint: URL;
  try {
    const base = new URL(baseUrl);
    if (base.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && base.hostname === "localhost")) {
      throw new Error();
    }
    endpoint = new URL("chat/completions", base.toString().replace(/\/?$/, "/"));
  } catch {
    return NextResponse.json({ error: "AI_BASE_URL must be a valid HTTPS API base URL." }, { status: 503 });
  }

  const model = process.env.AI_MODEL;
  if (!model) return NextResponse.json({ error: "Set AI_MODEL in the server environment to enable tailoring." }, { status: 503 });

  const experience = profile.experience as ExperienceItem[];
  const candidateFacts = JSON.stringify({
    name: profile.name,
    headline: profile.headline,
    summary: profile.summary,
    skills: profile.skills,
    experience,
    education: profile.education,
  });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You help tailor job application materials. Return only a JSON object with headline, summary, skills, experience, and coverLetter. Never invent or imply a qualification, skill, employer, title, date, achievement, metric, or personal fact. Keep the candidate's employers, titles, locations, and periods exactly as provided. Rewrite only existing experience bullets, keep the same number and order of roles, and use only skills already present in the candidate profile. If a useful fact is absent, omit it. The candidate must review every suggestion before use.",
          },
          {
            role: "user",
            content: JSON.stringify({
              candidate: candidateFacts,
              job: {
                company: application.companyName,
                title: application.title,
                location: application.location,
                description: application.description,
              },
              outputShape: {
                headline: "string",
                summary: "string",
                skills: ["existing candidate skill"],
                experience: [{ bullets: ["rephrased existing fact"] }],
                coverLetter: "string",
              },
            }),
          },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(60000),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "The AI provider could not be reached. Check the server configuration and try again." }, { status: 502 });
  }
  if (!response.ok) {
    console.error("AI provider request failed.", response.status);
    return NextResponse.json({ error: `The AI provider returned HTTP ${response.status}. Check its key, model, and quota.` }, { status: 502 });
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return NextResponse.json({ error: "The AI provider returned invalid JSON." }, { status: 502 });
  }
  const content =
    raw && typeof raw === "object" && Array.isArray((raw as { choices?: unknown }).choices)
      ? (raw as { choices: Array<{ message?: { content?: unknown } }> }).choices[0]?.message?.content
      : undefined;
  if (typeof content !== "string") {
    return NextResponse.json({ error: "The AI provider returned an unexpected response." }, { status: 502 });
  }

  let generated: unknown;
  try {
    generated = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: "The AI response could not be parsed. Try generating again." }, { status: 502 });
  }
  const parsed = generatedSchema.safeParse(generated);
  if (!parsed.success) return NextResponse.json({ error: "The AI response did not match the required draft format." }, { status: 502 });

  const allowedSkills = new Map(profile.skills.map((skill) => [skill.toLowerCase(), skill]));
  const verifiedSkills = parsed.data.skills.flatMap((skill) => {
    const existing = allowedSkills.get(skill.toLowerCase());
    return existing ? [existing] : [];
  });
  const tailoredExperience = experience.map((item, index) => ({
    ...item,
    bullets: parsed.data.experience[index]?.bullets ?? item.bullets,
  }));
  const tailoredCv = {
    headline: parsed.data.headline,
    summary: parsed.data.summary,
    skills: verifiedSkills,
    experience: tailoredExperience,
  };

  const updated = await prisma.application.update({
    where: { id, ownerId: userId },
    data: {
      tailoredCv: tailoredCv as Prisma.InputJsonValue,
      coverLetter: parsed.data.coverLetter,
    },
  });
  return NextResponse.json({ application: updated });
}
