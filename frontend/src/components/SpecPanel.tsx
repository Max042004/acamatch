import { Check, HelpCircle, FileText } from "lucide-react"
import type { ProjectSpec, ReqStatus } from "@/lib/types"
import { countByStatus } from "@/lib/spec"

interface Props {
  spec: ProjectSpec
  loading: boolean
  onConfirmReq: (reqId: string) => void
  onAnswer: (text: string) => void
}

const STATUS_META: Record<ReqStatus, { label: string; cls: string; dot: string }> = {
  confirmed: { label: "已確認", cls: "text-emerald-300", dot: "bg-emerald-400" },
  assumed: { label: "AI 假設", cls: "text-amber-300", dot: "bg-amber-400" },
  open: { label: "待釐清", cls: "text-sky-300", dot: "bg-sky-400" },
}

export default function SpecPanel({ spec, loading, onConfirmReq, onAnswer }: Props) {
  const counts = countByStatus(spec)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-sky-400" />
          規格書
        </div>
        <div className="mt-1.5 flex gap-3 text-xs">
          <span className="text-emerald-300">● 已確認 {counts.confirmed}</span>
          <span className="text-amber-300">● 假設 {counts.assumed}</span>
          <span className="text-sky-300">● 待釐清 {counts.open}</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {/* Requirements */}
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">需求</div>
          {spec.requirements.length === 0 && (
            <p className="text-xs text-muted-foreground/70">還沒有需求。對話一句話，這裡就會開始長出來。</p>
          )}
          <ul className="space-y-2">
            {spec.requirements.map((r) => {
              const m = STATUS_META[r.status]
              return (
                <li key={r.id} className="rounded-md border border-border/60 bg-card/40 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className={"mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " + m.dot} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground/90">{r.statement}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={"text-[11px] font-medium " + m.cls}>{m.label}</span>
                        {r.source && (
                          <span className="truncate text-[11px] text-muted-foreground/70">· {r.source}</span>
                        )}
                      </div>
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
        {spec.open_questions.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <HelpCircle className="h-3.5 w-3.5" /> AI 想跟你釐清
            </div>
            <ul className="space-y-2">
              {spec.open_questions.map((q) => (
                <li key={q.id} className="rounded-md border border-sky-500/20 bg-sky-500/5 p-2.5">
                  <div className="text-sm text-foreground/90">{q.question}</div>
                  {q.why && <div className="mt-0.5 text-[11px] text-muted-foreground">{q.why}</div>}
                  {q.options && q.options.length > 0 && (
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
      </div>
    </div>
  )
}
