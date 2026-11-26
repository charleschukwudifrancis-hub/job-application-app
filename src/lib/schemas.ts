import { z } from "zod";

const experienceItemSchema = z.object({
  company: z.string().trim().max(120),
  role: z.string().trim().max(120),
  location: z.string().trim().max(120),
  period: z.string().trim().max(80),
  bullets: z.array(z.string().trim().max(500)).max(12),
});

const educationItemSchema = z.object({
  institution: z.string().trim().max(160),
  qualification: z.string().trim().max(160),
  location: z.string().trim().max(120),
  period: z.string().trim().max(80),
});

export const profileSchema = z.object({
  name: z.string().trim().max(120),
  email: z.string().trim().max(254),
  phone: z.string().trim().max(60),
  location: z.string().trim().max(160),
  headline: z.string().trim().max(180),
  summary: z.string().trim().max(3000),
  skills: z.array(z.string().trim().min(1).max(80)).max(80),
  experience: z.array(experienceItemSchema).max(20),
  education: z.array(educationItemSchema).max(20),
});

export const boardSchema = z.object({
  provider: z.enum(["GREENHOUSE", "LEVER"]),
  companyName: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use the employer's board slug, not a URL."),
});

export const createApplicationSchema = z.object({
  provider: z.enum(["GREENHOUSE", "LEVER"]),
  externalId: z.string().trim().min(1).max(120),
  companyName: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(180),
  location: z.string().trim().max(180),
  description: z.string().trim().min(1).max(30000),
  applyUrl: z.string().url().max(1000),
});

export const applicationEditSchema = z.object({
  tailoredCv: z
    .object({
      headline: z.string().trim().max(180),
      summary: z.string().trim().max(3000),
      skills: z.array(z.string().trim().min(1).max(80)).max(80),
      experience: z.array(experienceItemSchema).max(20),
    })
    .optional(),
  coverLetter: z.string().trim().max(8000).optional(),
});
