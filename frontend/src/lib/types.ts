// The IR — one structured model, rendered two ways (規格 + PoC).

export type ReqStatus = "confirmed" | "assumed" | "open"

export interface Requirement {
  id: string
  statement: string
  status: ReqStatus
  source?: string
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

export interface ProjectSpec {
  title: string
  one_liner: string
  assistant_message: string
  requirements: Requirement[]
  open_questions: OpenQuestion[]
  screens: Screen[]
}

export interface ChatMsg {
  role: "user" | "assistant"
  text: string
}
