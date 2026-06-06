import type { ProjectSpec, Requirement } from "./types"

export const EMPTY_SPEC: ProjectSpec = {
  title: "尚未命名的專案",
  one_liner: "把一句模糊的需求丟進對話框，規格與 PoC 會同時長出來。",
  assistant_message: "",
  requirements: [],
  open_questions: [],
  screens: [],
}

// Opening lines a 開標方 might actually say — deliberately vague.
export const STARTERS = [
  "我們想要一個讓市民可以線上預約活動中心場地的系統",
  "做一個民眾查詢案件辦理進度的網站",
  "想要一個廠商上傳投標文件、我們線上審查的平台",
]

// Client-side confirmation is authoritative. After the model returns a fresh
// spec, re-stamp any requirement the user confirmed on the PoC back to
// "confirmed" — so the model can never silently downgrade it.
export function applyConfirmed(spec: ProjectSpec, confirmedIds: Set<string>): ProjectSpec {
  if (confirmedIds.size === 0) return spec
  return {
    ...spec,
    requirements: spec.requirements.map((r) =>
      confirmedIds.has(r.id) ? { ...r, status: "confirmed" as const } : r,
    ),
  }
}

export function setRequirementStatus(
  spec: ProjectSpec,
  reqId: string,
  status: Requirement["status"],
  source?: string,
): ProjectSpec {
  return {
    ...spec,
    requirements: spec.requirements.map((r) =>
      r.id === reqId ? { ...r, status, ...(source ? { source } : {}) } : r,
    ),
  }
}

export function countByStatus(spec: ProjectSpec) {
  const c = { confirmed: 0, assumed: 0, open: 0 }
  for (const r of spec.requirements) c[r.status]++
  return c
}
