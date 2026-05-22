export type TRL = "HIGH" | "MEDIUM" | "LOW"

export interface AnalysisResult {
  tech_direction: string
  tech_keywords: string[]
  recommended_professors: {
    name: string
    school: string
    expertise: string
  }[]
  trl_score: TRL
  trl_explanation: string
  roi_estimate: string
  implementation_advice: string
  related_paper_count: number
}

export interface Report {
  id: string
  session_id: string
  business_problem: string
  industry: string | null
  key_metrics: string | null
  budget_range: string | null
  result: AnalysisResult
  created_at: string
}
