import type { ReactNode } from "react"
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  FileText,
  HelpCircle,
  Loader2,
  Presentation,
  Users,
  Workflow,
} from "lucide-react"
import type { DocumentAnalysis, DocumentSectionStatus, ProjectSpec, ReqStatus, RequirementCategory, RiskLevel } from "@/lib/types"
import { countByStatus } from "@/lib/spec"

interface Props {
  spec: ProjectSpec
  analysis: DocumentAnalysis | null
  loading: boolean
  onConfirmReq: (reqId: string) => void
  onAnswer: (text: string) => void
  onSelectAnalysisSection: (sectionId: string) => void
}

const STATUS_META: Record<ReqStatus, { label: string; cls: string; dot: string }> = {
  confirmed: { label: "已確認", cls: "text-emerald-300", dot: "bg-emerald-400" },
  assumed: { label: "AI 假設", cls: "text-amber-300", dot: "bg-amber-400" },
  open: { label: "待釐清", cls: "text-sky-300", dot: "bg-sky-400" },
}

const CATEGORY_LABEL: Record<RequirementCategory, string> = {
  functional: "功能",
  non_functional: "非功能",
  role: "角色/權限",
  process: "流程",
  data: "資料",
  integration: "整合",
}

const RISK_LABEL: Record<RiskLevel, { label: string; cls: string }> = {
  low: { label: "低", cls: "text-emerald-300" },
  medium: { label: "中", cls: "text-amber-300" },
  high: { label: "高", cls: "text-rose-300" },
}

const SECTION_STATUS_META: Record<DocumentSectionStatus, { label: string; cls: string; dot: string }> = {
  pending: { label: "待執行", cls: "text-muted-foreground", dot: "bg-muted-foreground" },
  running: { label: "執行中", cls: "text-sky-300", dot: "bg-sky-400" },
  done: { label: "完成", cls: "text-emerald-300", dot: "bg-emerald-400" },
  error: { label: "錯誤", cls: "text-rose-300", dot: "bg-rose-400" },
}

export default function SpecPanel({ spec, analysis, loading, onConfirmReq, onAnswer, onSelectAnalysisSection }: Props) {
  const counts = countByStatus(spec)
  const requirements = Array.isArray(spec.requirements) ? spec.requirements : []
  const openQuestions = Array.isArray(spec.open_questions) ? spec.open_questions : []
  const stakeholders = Array.isArray(spec.stakeholders) ? spec.stakeholders : []
  const businessProcess = Array.isArray(spec.business_process) ? spec.business_process : []
  const risks = Array.isArray(spec.risks) ? spec.risks : []
  const acceptanceCriteria = Array.isArray(spec.acceptance_criteria) ? spec.acceptance_criteria : []
  const proposalMaterials = Array.isArray(spec.proposal_materials) ? spec.proposal_materials : []
  const wbs = Array.isArray(spec.wbs) ? spec.wbs : []

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-sky-400" />
          Pre-sales 提案工作台
        </div>
        <div className="mt-1.5 flex gap-3 text-xs">
          <span className="text-emerald-300">● 已確認 {counts.confirmed}</span>
          <span className="text-amber-300">● 假設 {counts.assumed}</span>
          <span className="text-sky-300">● 待釐清 {counts.open}</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {analysis && (
          <div className="rounded-md border border-sky-500/20 bg-sky-500/5 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wider text-sky-200">文件分析</div>
                <div className="truncate text-[11px] text-muted-foreground">{analysis.filename}</div>
              </div>
              {analysis.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />}
            </div>
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {analysis.sections.map((section) => {
                const meta = SECTION_STATUS_META[section.status]
                const active = (analysis.selectedSectionId || analysis.currentSectionId) === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => onSelectAnalysisSection(section.id)}
                    className={
                      "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[11px] " +
                      (active
                        ? "border-sky-400 bg-sky-500/15 text-sky-100"
                        : "border-border/60 bg-background/30 text-foreground/75 hover:bg-accent")
                    }
                  >
                    <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + meta.dot} />
                    <span className="min-w-0 flex-1 truncate">{section.title}</span>
                  </button>
                )
              })}
            </div>
            {(() => {
              const selected =
                analysis.sections.find((section) => section.id === analysis.selectedSectionId) ||
                analysis.sections.find((section) => section.id === analysis.currentSectionId) ||
                analysis.sections[0]
              if (!selected) return null
              const meta = SECTION_STATUS_META[selected.status]
              return (
                <div className="rounded-md border border-border/60 bg-background/35 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium text-foreground/90">
                      {selected.title} <span className="text-muted-foreground">· {selected.range}</span>
                    </div>
                    <span className={"text-[11px] " + meta.cls}>{meta.label}</span>
                  </div>
                  {selected.excerpt && (
                    <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{selected.excerpt}</div>
                  )}
                  <ul className="mt-2 space-y-1">
                    {selected.log.map((item, index) => (
                      <li key={index} className="text-[11px] leading-relaxed text-foreground/75">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}
          </div>
        )}

        {/* Intake summary */}
        {(spec.source_summary || stakeholders.length > 0 || businessProcess.length > 0) && (
          <div className="space-y-2 rounded-md border border-border/60 bg-card/30 p-2.5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">提案輪廓</div>
            {spec.source_summary && <p className="text-sm leading-relaxed text-foreground/85">{spec.source_summary}</p>}
            {stakeholders.length > 0 && (
              <MiniList icon={<Users className="h-3.5 w-3.5" />} title="利害關係人" items={stakeholders} />
            )}
            {businessProcess.length > 0 && (
              <MiniList icon={<Workflow className="h-3.5 w-3.5" />} title="業務流程" items={businessProcess} />
            )}
          </div>
        )}

        {/* Requirements */}
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">需求拆解</div>
          {requirements.length === 0 && (
            <p className="text-xs text-muted-foreground/70">還沒有需求。貼上標案摘要或訪談逐字稿，這裡就會開始長出來。</p>
          )}
          <ul className="space-y-2">
            {requirements.map((r) => {
              const m = STATUS_META[r.status] || STATUS_META.open
              const ambiguity = r.ambiguity ? RISK_LABEL[r.ambiguity] : null
              return (
                <li key={r.id} className="rounded-md border border-border/60 bg-card/40 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className={"mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " + m.dot} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground/90">{r.statement}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={"text-[11px] font-medium " + m.cls}>{m.label}</span>
                        {r.category && CATEGORY_LABEL[r.category] && (
                          <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {CATEGORY_LABEL[r.category]}
                          </span>
                        )}
                        {ambiguity && (
                          <span className={"text-[11px] " + ambiguity.cls}>模糊度 {ambiguity.label}</span>
                        )}
                        {r.source && (
                          <span className="truncate text-[11px] text-muted-foreground/70">· {r.source}</span>
                        )}
                      </div>
                      {r.estimateImpact && (
                        <div className="mt-1 text-[11px] text-muted-foreground">估價影響：{r.estimateImpact}</div>
                      )}
                    </div>
                    {r.status !== "confirmed" && (
                      <button
                        title="確認這條需求"
                        className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/25"
                        onClick={() => onConfirmReq(r.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Open questions — the 釋疑 loop */}
        {openQuestions.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5" /> AI 想跟你釐清
            </div>
            <ul className="space-y-2">
              {openQuestions.map((q) => (
                <li key={q.id} className="rounded-md border border-sky-500/20 bg-sky-500/5 p-2.5">
                  <div className="text-sm text-foreground/90">{q.question}</div>
                  {q.why && <div className="mt-0.5 text-[11px] text-muted-foreground">{q.why}</div>}
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.options.map((opt, i) => (
                        <button
                          key={i}
                          disabled={loading}
                          className="rounded-full border border-sky-500/30 bg-background/40 px-2.5 py-1 text-xs text-sky-200 hover:bg-sky-500/15 disabled:opacity-50"
                          onClick={() => onAnswer(`關於「${q.question}」：${opt}`)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {risks.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" /> 風險與假設
            </div>
            <ul className="space-y-2">
              {risks.map((risk) => {
                const m = RISK_LABEL[risk.level] || RISK_LABEL.medium
                return (
                  <li key={risk.id} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm text-foreground/90">{risk.title}</div>
                      <span className={"shrink-0 text-[11px] font-medium " + m.cls}>{m.label}</span>
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{risk.detail}</div>
                    {risk.mitigation && (
                      <div className="mt-1 text-[11px] text-muted-foreground/80">建議處理：{risk.mitigation}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {acceptanceCriteria.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <ClipboardCheck className="h-3.5 w-3.5" /> 驗收條件草案
            </div>
            <ul className="space-y-2">
              {acceptanceCriteria.map((ac) => {
                const m = STATUS_META[ac.status] || STATUS_META.open
                return (
                  <li key={ac.id} className="rounded-md border border-border/60 bg-card/40 p-2.5">
                    <div className="text-sm text-foreground/90">{ac.criterion}</div>
                    <div className="mt-1 flex gap-2 text-[11px]">
                      <span className={m.cls}>{m.label}</span>
                      {ac.reqRef && <span className="text-muted-foreground">連到 {ac.reqRef}</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {proposalMaterials.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Presentation className="h-3.5 w-3.5" /> 提案素材
            </div>
            <ul className="space-y-2">
              {proposalMaterials.map((m) => (
                <li key={m.id} className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                  <div className="text-sm font-medium text-foreground/90">{m.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.content}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {wbs.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">初步 WBS</div>
            <ul className="space-y-2">
              {wbs.map((item) => (
                <li key={item.id} className="rounded-md border border-border/60 bg-card/40 p-2.5">
                  <div className="text-sm text-foreground/90">{item.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.deliverable}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground/80">
                    {item.effort && <span>工時：{item.effort}</span>}
                    {item.dependency && <span>依賴：{item.dependency}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniList({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="rounded bg-accent px-2 py-1 text-[11px] text-foreground/80">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
