import type { ProjectSpec, Requirement } from "./types"

export const EMPTY_SPEC: ProjectSpec = {
  title: "未命名提案專案",
  one_liner: "貼上標案文件、會議筆記或訪談逐字稿，先拆出可提案、可估價、可驗收的輪廓。",
  assistant_message: "",
  workflow: "pre_sales",
  source_summary: "",
  stakeholders: [],
  business_process: [],
  requirements: [],
  open_questions: [],
  risks: [],
  acceptance_criteria: [],
  proposal_materials: [],
  wbs: [],
  screens: [],
}

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
  for (const r of Array.isArray(spec.requirements) ? spec.requirements : []) {
    if (r.status === "confirmed" || r.status === "assumed" || r.status === "open") c[r.status]++
  }
  return c
}
