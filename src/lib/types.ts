export type BoardProvider = "GREENHOUSE" | "LEVER";

export type ExperienceItem = {
  company: string;
  role: string;
  location: string;
  period: string;
  bullets: string[];
};

export type EducationItem = {
  institution: string;
  qualification: string;
  location: string;
  period: string;
};

export type CvProfile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
};

export type Job = {
  id: string;
  provider: BoardProvider;
  boardId: string;
  companyName: string;
  title: string;
  location: string;
  description: string;
  applyUrl: string;
  updatedAt: string | null;
};

export type TailoredCv = {
  headline: string;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
};

export type ApplicationDraft = {
  id: string;
  provider: BoardProvider;
  externalId: string;
  companyName: string;
  title: string;
  location: string;
  description: string;
  applyUrl: string;
  tailoredCv: TailoredCv | null;
  coverLetter: string;
  status: "DRAFT" | "APPROVED" | "HANDED_OFF";
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_PROFILE: CvProfile = {
  name: "",
  email: "",
  phone: "",
  location: "",
  headline: "",
  summary: "",
  skills: [],
  experience: [],
  education: [],
};
