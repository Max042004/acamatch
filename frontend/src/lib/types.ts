// The IR — one structured model, rendered two ways (規格 + PoC).

export type ReqStatus = "confirmed" | "assumed" | "open"
export type RequirementCategory = "functional" | "non_functional" | "role" | "process" | "data" | "integration"
export type RiskLevel = "low" | "medium" | "high"

export interface Requirement {
  id: string
  statement: string
  status: ReqStatus
  source?: string
  category?: RequirementCategory
  ambiguity?: RiskLevel
  estimateImpact?: string
}

export interface OpenQuestion {
  id: string
  question: string
  why?: string
  options?: string[]
}

export type ComponentType =
  | "navbar"
  | "hero"
  | "heading"
  | "text"
  | "field"
  | "select"
  | "timeslots"
  | "calendar"
  | "button"
  | "card"
  | "list"
  | "table"
  | "steps"
  | "stat"
  | "badge"
  | "notice"
  | "divider"
  | "image"

export interface PocComponent {
  id: string
  type: ComponentType
  reqRef?: string
  props: Record<string, any>
}

export interface Screen {
  id: string
  name: string
  components: PocComponent[]
}

export interface RiskItem {
  id: string
  title: string
  level: RiskLevel
  detail: string
  mitigation?: string
}

export interface AcceptanceCriterion {
  id: string
  reqRef?: string
  criterion: string
  status: ReqStatus
}

export interface ProposalMaterial {
  id: string
  title: string
  content: string
  type: "slide" | "talk_track" | "proposal_section" | "demo_note"
}

export interface WbsItem {
  id: string
  name: string
  deliverable: string
  effort?: string
  dependency?: string
}

export interface ProjectSpec {
  title: string
  one_liner: string
  assistant_message: string
  workflow: "pre_sales"
  source_summary: string
  stakeholders: string[]
  business_process: string[]
  requirements: Requirement[]
  open_questions: OpenQuestion[]
  risks: RiskItem[]
  acceptance_criteria: AcceptanceCriterion[]
  proposal_materials: ProposalMaterial[]
  wbs: WbsItem[]
  screens: Screen[]
}

export type DocumentSectionStatus = "pending" | "running" | "done" | "error"

export interface DocumentSection {
  id: string
  title: string
  range: string
  status: DocumentSectionStatus
  excerpt: string
  log: string[]
}

export interface DocumentAnalysis {
  filename: string
  status: DocumentSectionStatus
  currentSectionId?: string
  selectedSectionId?: string
  sections: DocumentSection[]
}

export interface ChatMsg {
  role: "user" | "assistant"
  text: string
  displayText?: string
}

export interface ExtractedFile {
  filename: string
  mime: string
  text: string
  pages: Array<{ num: number; text: string }>
}
