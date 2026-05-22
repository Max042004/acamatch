import { useState } from "react"
import { Loader2, Sparkles, FileText, GraduationCap, TrendingUp, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { getSessionId } from "@/lib/session"
import type { AnalysisResult, Report, TRL } from "@/lib/types"

const INDUSTRIES = ["製造業", "半導體", "醫療", "金融", "零售", "農業", "其他"]
const BUDGETS = ["小型 (<100萬)", "中型 (100萬–1000萬)", "大型 (>1000萬)"]

export default function Analyze() {
  const [problem, setProblem] = useState("")
  const [industry, setIndustry] = useState("製造業")
  const [metrics, setMetrics] = useState("")
  const [budget, setBudget] = useState("中型 (100萬–1000萬)")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!problem.trim()) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const { data, error } = await supabase.functions.invoke<{ report: Report }>("analyze", {
        body: {
          session_id: getSessionId(),
          business_problem: problem,
          industry,
          key_metrics: metrics,
          budget_range: budget,
        },
      })
      if (error) throw error
      if (!data?.report) throw new Error("No report returned")
      setReport(data.report)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-10 lg:py-16">
      <div className="max-w-3xl mb-10">
        <div className="text-sm text-sky-400 font-semibold mb-2">Product Demo</div>
        <h1 className="text-3xl lg:text-5xl font-bold mb-3">從商業問題到研究方向,只需要幾分鐘</h1>
        <p className="text-muted-foreground">
          輸入你的業務問題,AI 會自動產出技術轉型藍圖:技術方向、推薦教授、TRL 評估、ROI 區間與導入建議。
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle>企業輸入</CardTitle>
            <CardDescription>用商業語言提問即可</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="problem">商業問題 *</Label>
                <Textarea
                  id="problem"
                  placeholder="例:想做 AI 瑕疵檢測,降低 PCB 板生產線的不良率"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">產業類型</Label>
                <Select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metrics">關鍵指標</Label>
                <Input
                  id="metrics"
                  placeholder="例:品質、效率、稼動率"
                  value={metrics}
                  onChange={(e) => setMetrics(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">預算範圍</Label>
                <Select id="budget" value={budget} onChange={(e) => setBudget(e.target.value)}>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </div>

              <Button type="submit" size="lg" disabled={loading || !problem.trim()} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    產出技術轉型藍圖
                  </>
                )}
              </Button>

              {error && (
                <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded p-3">
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          {!report && !loading && <EmptyState />}
          {loading && <LoadingState />}
          {report && <ResultDashboard result={report.result} />}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-20 text-center text-muted-foreground">
        <Sparkles className="w-10 h-10 mx-auto mb-4 text-sky-400/50" />
        <p className="text-sm">填寫左側表單,AI 會在幾秒內回傳技術轉型藍圖</p>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <Card>
      <CardContent className="py-20 text-center">
        <Loader2 className="w-10 h-10 mx-auto mb-4 text-sky-400 animate-spin" />
        <p className="text-sm text-muted-foreground">AI Semantic Analysis · Technology Mapping · TRL Scoring...</p>
      </CardContent>
    </Card>
  )
}

function ResultDashboard({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="text-xs text-sky-400 font-semibold uppercase tracking-wider">結果 Dashboard</div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            技術方向
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 mb-4">{result.tech_direction}</p>
          <div className="flex flex-wrap gap-2">
            {result.tech_keywords.map((k) => (
              <Badge key={k} variant="secondary">
                {k}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat
          icon={<TrendingUp className="w-4 h-4" />}
          label="技術成熟度 TRL"
          value={
            <div className="flex items-center gap-2">
              <TRLBadge trl={result.trl_score} />
            </div>
          }
          sub={result.trl_explanation}
        />
        <Stat
          icon={<TrendingUp className="w-4 h-4" />}
          label="ROI 參考"
          value={<span className="text-2xl font-bold text-emerald-400">{result.roi_estimate}</span>}
        />
        <Stat
          icon={<BookOpen className="w-4 h-4" />}
          label="相關論文"
          value={
            <span className="text-2xl font-bold">
              {result.related_paper_count} <span className="text-sm text-muted-foreground">篇</span>
            </span>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="w-5 h-5 text-sky-400" />
            推薦教授
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {result.recommended_professors.map((p, i) => (
              <div key={i} className="p-3 rounded-md border border-border bg-background/40">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-sky-400">{p.school}</div>
                <div className="text-sm text-muted-foreground mt-1">{p.expertise}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5 text-sky-400" />
            AI 導入建議
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
            {result.implementation_advice}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          {label}
        </div>
        <div className="mb-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

export function TRLBadge({ trl }: { trl: TRL }) {
  const variant = trl === "HIGH" ? "high" : trl === "MEDIUM" ? "medium" : "low"
  return <Badge variant={variant}>● {trl}</Badge>
}
