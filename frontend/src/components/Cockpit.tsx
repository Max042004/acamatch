import { type ReactNode, useRef, useState } from "react"
import { Braces, ChevronDown, Code2, Download, FileText, Layers } from "lucide-react"
import type { ChatMsg, PocComponent, ProjectSpec } from "@/lib/types"
import { exportDoc, iterate } from "@/lib/api"
import { EMPTY_SPEC, applyConfirmed, setRequirementStatus } from "@/lib/spec"
import { specToHtml } from "@/lib/codegen"
import PocCanvas from "./PocCanvas"
import SpecPanel from "./SpecPanel"
import ChatPanel from "./ChatPanel"
import ExportModal from "./ExportModal"

export default function Cockpit() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [spec, setSpec] = useState<ProjectSpec>(EMPTY_SPEC)
  const [confirmedReqIds, setConfirmedReqIds] = useState<Set<string>>(new Set())
  const [confirmedComponentIds, setConfirmedComponentIds] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Export ("匯出 → 真程式碼 / 標書草稿")
  const [menuOpen, setMenuOpen] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  const [docLoading, setDocLoading] = useState(false)
  const [docMarkdown, setDocMarkdown] = useState<string | null>(null)
  const [docError, setDocError] = useState<string | null>(null)

  const started = messages.length > 0

  async function send(text: string) {
    if (loading) return
    setError(null)
    setDraft("")
    const nextMessages: ChatMsg[] = [...messages, { role: "user", text }]
    setMessages(nextMessages)
    setLoading(true)
    try {
      const raw = await iterate(nextMessages, started ? spec : null)
      // Client-side confirmations are authoritative — re-stamp them.
      const merged = applyConfirmed(raw, confirmedReqIds)
      setSpec(merged)
      if (merged.assistant_message) {
        setMessages((m) => [...m, { role: "assistant", text: merged.assistant_message }])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // Instant, no LLM call — confirming on the PoC sinks the piece into the spec.
  function confirmComponent(c: PocComponent) {
    setConfirmedComponentIds((s) => new Set(s).add(c.id))
    if (c.reqRef) confirmReqId(c.reqRef, "你在 PoC 上確認了這塊")
  }

  function confirmReqId(reqId: string, source: string) {
    setConfirmedReqIds((s) => new Set(s).add(reqId))
    setSpec((sp) => setRequirementStatus(sp, reqId, "confirmed", source))
    // light up any component that realizes this requirement
    setConfirmedComponentIds((s) => {
      const next = new Set(s)
      for (const sc of spec.screens) for (const c of sc.components) if (c.reqRef === reqId) next.add(c.id)
      return next
    })
  }

  function rejectComponent(c: PocComponent) {
    const label = c.props?.label || c.props?.title || c.props?.text || c.type
    setDraft(`「${label}」這部分不太對，我想改成：`)
    inputRef.current?.focus()
  }

  // 標書草稿 (.md) — AI turns the confirmed spec into a 需求規格書.
  async function exportTender() {
    setMenuOpen(false)
    setDocError(null)
    setDocMarkdown(null)
    setDocLoading(true)
    setDocOpen(true)
    try {
      setDocMarkdown(await exportDoc(spec, "tender"))
    } catch (e) {
      setDocError(e instanceof Error ? e.message : String(e))
    } finally {
      setDocLoading(false)
    }
  }

  // 真程式碼 (.html) — deterministic IR → standalone page. Open it live + download.
  function exportHtml() {
    setMenuOpen(false)
    const url = URL.createObjectURL(new Blob([specToHtml(spec)], { type: "text/html" }))
    window.open(url, "_blank")
    const a = document.createElement("a")
    a.href = url
    a.download = `${spec.title || "poc"}.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  function exportJson() {
    setMenuOpen(false)
    const url = URL.createObjectURL(new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `${spec.title || "spec"}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-sky-400 to-emerald-400">
            <Layers className="h-4 w-4 text-background" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">
              Spec Cockpit <span className="font-normal text-muted-foreground">· 邊講邊出 PoC</span>
            </div>
            <div className="text-xs text-muted-foreground">{started ? spec.one_liner : "對話現場同時長出規格與可點擊原型"}</div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={!started}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-foreground/80 hover:bg-accent disabled:opacity-40"
            title="把確認後的規格一鍵轉成程式碼 / 標書草稿"
          >
            <Download className="h-3.5 w-3.5" />
            匯出
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-xl">
                <MenuItem
                  icon={<FileText className="h-4 w-4 text-sky-400" />}
                  title="需求規格書 / 標書草稿"
                  sub=".md · 由 AI 從規格生成"
                  onClick={exportTender}
                />
                <MenuItem
                  icon={<Code2 className="h-4 w-4 text-emerald-400" />}
                  title="PoC 程式碼"
                  sub=".html · 開新分頁 + 下載"
                  onClick={exportHtml}
                />
                <MenuItem
                  icon={<Braces className="h-4 w-4 text-muted-foreground" />}
                  title="規格原始檔"
                  sub=".json"
                  onClick={exportJson}
                />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Body: left (PoC + chat) | right (spec) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="flex min-h-0 flex-col border-r border-border/60">
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#0c1322] p-5">
            <PocCanvas
              spec={spec}
              confirmedComponentIds={confirmedComponentIds}
              loading={loading}
              onConfirm={confirmComponent}
              onReject={rejectComponent}
            />
          </div>
          <div className="h-[38%] min-h-[220px] shrink-0 border-t border-border/60">
            <ChatPanel
              messages={messages}
              draft={draft}
              loading={loading}
              error={error}
              inputRef={inputRef}
              onDraft={setDraft}
              onSend={send}
            />
          </div>
        </div>

        <aside className="hidden min-h-0 lg:block">
          <SpecPanel
            spec={spec}
            loading={loading}
            onConfirmReq={(id) => confirmReqId(id, "你確認了這條")}
            onAnswer={send}
          />
        </aside>
      </div>

      {docOpen && (
        <ExportModal
          title="需求規格書 / 標書草稿（草稿）"
          filename={`${spec.title || "需求規格書"}.md`}
          markdown={docMarkdown}
          loading={docLoading}
          error={docError}
          onClose={() => setDocOpen(false)}
        />
      )}
    </div>
  )
}

function MenuItem({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: ReactNode
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-accent">
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm text-foreground/90">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{sub}</span>
      </span>
    </button>
  )
}
