export type DraftStatus = "DRAFT" | "APPROVED" | "HANDED_OFF";
export type DraftAction = "edit" | "approve" | "handoff";

export function transitionDraft(status: DraftStatus, action: DraftAction): DraftStatus | null {
  if (action === "edit" && status !== "HANDED_OFF") return "DRAFT";
  if (action === "approve" && status === "DRAFT") return "APPROVED";
  if (action === "handoff" && status === "APPROVED") return "HANDED_OFF";
  return null;
}
