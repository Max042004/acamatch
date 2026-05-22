import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Loader2, FileText, GraduationCap, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { getSessionId } from "@/lib/session"
import type { Report } from "@/lib/types"
import { TRLBadge } from "./Analyze"

export default function Reports() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const sessionId = getSessionId()
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(50)
      if (cancelled) return
      if (error) {
        setError(error.message)
        setReports([])
        return
      }
      setReports((data ?? []) as Report[])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="container mx-auto px-6 py-10 lg:py-16">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
        <div>
          <div className="text-sm text-sky-400 font-semibold mb-2">History</div>
          <h1 className="text-3xl lg:text-5xl font-bold mb-2">歷史報告</h1>
          <p className="text-muted-foreground text-sm">
            根據本機 session ID 篩選 — 清除瀏覽器資料會看不到舊報告
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/analyze">
            新增分析 <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </div>

      {error && (
        <Card className="border-rose-500/30">
          <CardContent className="py-6 text-rose-300 text-sm">{error}</CardContent>
        </Card>
      )}

      {!reports && !error && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 載入中...
        </div>
      )}

      {reports && reports.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-4 text-sky-400/40" />
            <p className="mb-4 text-sm">尚未有任何報告</p>
            <Button asChild>
              <Link to="/analyze">前往技術分析</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {reports && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              open={openId === r.id}
              onToggle={() => setOpenId(openId === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ReportRow({
  report,
  open,
  onToggle,
}: {
  report: Report
  open: boolean
  onToggle: () => void
}) {
  const dt = new Date(report.created_at)
  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-1">{report.business_problem}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
              <span>{dt.toLocaleString("zh-TW")}</span>
              {report.industry && (
                <>
                  <span>·</span>
                  <span>{report.industry}</span>
                </>
              )}
              {report.budget_range && (
                <>
                  <span>·</span>
                  <span>{report.budget_range}</span>
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TRLBadge trl={report.result.trl_score} />
            <Button variant="ghost" size="sm">
              {open ? "收起" : "展開"}
            </Button>
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4 border-t border-border/60 pt-4">
          <Section title="技術方向">
            <p className="text-sm text-foreground/90">{report.result.tech_direction}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {report.result.tech_keywords.map((k) => (
                <Badge key={k} variant="secondary">
                  {k}
                </Badge>
              ))}
            </div>
          </Section>

          <Section title="推薦教授" icon={<GraduationCap className="w-4 h-4" />}>
            <div className="grid sm:grid-cols-2 gap-2">
              {report.result.recommended_professors.map((p, i) => (
                <div key={i} className="p-2.5 rounded border border-border bg-background/40 text-sm">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-sky-400">{p.school}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.expertise}</div>
                </div>
              ))}
            </div>
          </Section>

          <div className="grid sm:grid-cols-3 gap-3">
            <Mini label="TRL 說明" value={report.result.trl_explanation} />
            <Mini label="ROI 參考" value={report.result.roi_estimate} />
            <Mini
              label="相關論文"
              value={
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> {report.result.related_paper_count} 篇
                </span>
              }
            />
          </div>

          <Section title="AI 導入建議">
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
              {report.result.implementation_advice}
            </p>
          </Section>
        </CardContent>
      )}
    </Card>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3 rounded border border-border bg-background/40">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}
