import { type ReactNode, useRef, useState } from "react"
import { Braces, BriefcaseBusiness, ChevronDown, Code2, Download, FileText } from "lucide-react"
import type { ChatMsg, DocumentAnalysis, DocumentSection, PocComponent, ProjectSpec } from "@/lib/types"
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
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Export ("匯出 → PoC / 提案附件")
  const [menuOpen, setMenuOpen] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  const [docLoading, setDocLoading] = useState(false)
  const [docMarkdown, setDocMarkdown] = useState<string | null>(null)
  const [docError, setDocError] = useState<string | null>(null)

  const started = messages.length > 0

  async function send(text: string, displayText?: string) {
    if (loading) return
    setError(null)
    setDraft("")
    const nextMessages: ChatMsg[] = [...messages, { role: "user", text, displayText }]
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

  async function analyzeFile(file: { filename: string; text: string; pages: Array<{ num: number; text: string }> }, userNote?: string) {
    if (loading) return
    const chunks = buildDocumentChunks(file)
    const initialAnalysis: DocumentAnalysis = {
      filename: file.filename,
      status: "running",
      currentSectionId: "outline",
      selectedSectionId: "outline",
      sections: [
        {
          id: "outline",
          title: "文件大綱與分析計畫",
          range: "全文件",
          status: "running",
          excerpt: `系統已將文件切成 ${chunks.length} 個段落，會先建立全文件大綱，再按段落順序逐段更新需求、風險、驗收條件與提案素材。`,
          log: ["建立分段計畫", "開始產生整份文件大綱"],
        },
        ...chunks.map(({ content: _content, ...section }) => section),
        {
          id: "poc",
          title: "PoC 需求對應收斂",
          range: "全文件",
          status: "pending",
          excerpt: "分段需求拆解完成後，系統會根據招標書明確需求產生可展示 PoC，並檢查每個元件都有對應需求。",
          log: ["等待需求拆解完成"],
        },
      ],
    }

    setError(null)
    setDraft("")
    setAnalysis(initialAnalysis)
    setMessages((m) => [
      ...m,
      {
        role: "user",
        text: `使用者上傳檔案：${file.filename}`,
        displayText: `已上傳「${file.filename}」，系統將先建立大綱，再依段落順序分析。`,
      },
    ])
    setLoading(true)

    let workingSpec = spec
    try {
      const outlinePrompt = [
        userNote ? `使用者補充：\n${userNote}` : "",
        `資料來源：${file.filename}`,
        "這是一份內容較長的招標/提案相關文件。請先只做「文件大綱與分段分析計畫」，不要嘗試一次完成所有細部需求。",
        "請根據下列分段摘要，建立初步 ProjectSpec：source_summary、stakeholders、business_process、open_questions、risks 可以先粗略；requirements 只放最明確的高階需求；PoC 先做最核心的 1 個示意畫面即可。",
        makeOutlineExcerpt(chunks),
      ]
        .filter(Boolean)
        .join("\n\n")

      const outlined = await iterate([{ role: "user", text: outlinePrompt }], started ? spec : null)
      workingSpec = applyConfirmed(outlined, confirmedReqIds)
      setSpec(workingSpec)
      setMessages((m) => [
        ...m,
        { role: "assistant", text: outlined.assistant_message || "已完成文件大綱與分段分析計畫。" },
      ])
      updateAnalysisSection("outline", { status: "done" }, "大綱完成，準備逐段分析")

      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index]
        setAnalysis((current) =>
          current
            ? {
                ...current,
                currentSectionId: chunk.id,
                selectedSectionId: current.selectedSectionId || chunk.id,
                sections: current.sections.map((section) =>
                  section.id === chunk.id
                    ? { ...section, status: "running", log: [...section.log, "開始分析本段"] }
                    : section,
                ),
              }
            : current,
        )

        const chunkPrompt = [
          `資料來源：${file.filename}`,
          `目前正在依序分析第 ${index + 1} / ${chunks.length} 段：${chunk.title}（${chunk.range}）。`,
          "請只根據本段內容更新 ProjectSpec，並保留已確認與前面段落已建立的結構。重點：補需求、補待釐清問題、標記風險、補驗收條件草案、提案素材與 WBS。不要逐字重複原文。",
          `本段內容：\n${chunk.content.slice(0, 12000)}`,
        ].join("\n\n")

        const nextSpec = await iterate([{ role: "user", text: chunkPrompt }], workingSpec)
        workingSpec = applyConfirmed(nextSpec, confirmedReqIds)
        setSpec(workingSpec)
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: nextSpec.assistant_message || `已完成 ${chunk.title}。`,
            displayText: `已完成 ${chunk.title}（${chunk.range}）`,
          },
        ])
        updateAnalysisSection(chunk.id, { status: "done" }, "本段分析完成，已回填到右側提案工作台")
      }

      setAnalysis((current) =>
        current
          ? {
              ...current,
              currentSectionId: "poc",
              selectedSectionId: current.selectedSectionId || "poc",
              sections: current.sections.map((section) =>
                section.id === "poc"
                  ? { ...section, status: "running", log: [...section.log, "開始根據明確需求收斂 PoC"] }
                  : section,
              ),
            }
          : current,
      )

      const pocPrompt = [
        `資料來源：${file.filename}`,
        "所有段落已完成需求拆解。現在請只做最後的 PoC 收斂。",
        "請根據目前 ProjectSpec 中「招標書明確寫到、或可從文件原文直接定位」的需求產生/修正 screens。",
        "硬性規則：",
        "1. screens 不可為空，至少產生 1 個可展示的核心流程畫面。",
        "2. 每個 PoC component 都必須有 reqRef。",
        "3. reqRef 必須對應 requirements 裡的明確需求；不要把純 AI 假設當成畫面依據。",
        "4. 每個被 PoC 使用的 requirement.source 應寫出來源，例如「招標書第 3 頁：文件上傳」或「第 5-6 頁：審查流程」。",
        "5. 如果某個畫面需要但招標書未明確寫到，請放進 open_questions 或 risks，不要做成 PoC 元件。",
      ].join("\n")

      const pocSpec = await iterate([{ role: "user", text: pocPrompt }], workingSpec)
      workingSpec = ensurePocScreens(applyConfirmed(pocSpec, confirmedReqIds))
      setSpec(workingSpec)
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: pocSpec.assistant_message || "已完成 PoC 收斂，並把畫面元件對應到招標書需求。",
          displayText: "已完成 PoC 收斂，畫面元件已對應招標書明確需求。",
        },
      ])
      updateAnalysisSection("poc", { status: "done" }, "PoC 收斂完成，已檢查元件與需求對應")

      setAnalysis((current) =>
        current
          ? {
              ...current,
              status: "done",
              currentSectionId: undefined,
            }
          : current,
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      setAnalysis((current) =>
        current
          ? {
              ...current,
              status: "error",
              sections: current.sections.map((section) =>
                section.id === current.currentSectionId
                  ? { ...section, status: "error", log: [...section.log, `錯誤：${message}`] }
                  : section,
              ),
            }
          : current,
      )
    } finally {
      setLoading(false)
    }
  }

  function updateAnalysisSection(sectionId: string, patch: Partial<DocumentSection>, log?: string) {
    setAnalysis((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section) =>
              section.id === sectionId
                ? {
                    ...section,
                    ...patch,
                    log: log ? [...section.log, log] : section.log,
                  }
                : section,
            ),
          }
        : current,
    )
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

  // 提案附件包 (.md) — AI turns the confirmed pre-sales spec into proposal material.
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
            <BriefcaseBusiness className="h-4 w-4 text-background" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">
              Acamatch <span className="font-normal text-muted-foreground">· SI Pre-sales Cockpit</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {started ? spec.one_liner : "把一次訪談轉成需求摘要、追問問題、PoC、驗收條件與提案素材"}
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={!started}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-foreground/80 hover:bg-accent disabled:opacity-40"
            title="把確認後的規格一鍵轉成 PoC / 提案附件包"
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
                  title="提案附件包"
                  sub=".md · 摘要、風險、驗收與 WBS"
                  onClick={exportTender}
                />
                <MenuItem
                  icon={<Code2 className="h-4 w-4 text-emerald-400" />}
                  title="提案用 PoC"
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
              onAnalyzeFile={analyzeFile}
            />
          </div>
        </div>

        <aside className="hidden min-h-0 lg:block">
          <SpecPanel
            spec={spec}
            analysis={analysis}
            loading={loading}
            onConfirmReq={(id) => confirmReqId(id, "你確認了這條")}
            onAnswer={send}
            onSelectAnalysisSection={(id) =>
              setAnalysis((current) => (current ? { ...current, selectedSectionId: id } : current))
            }
          />
        </aside>
      </div>

      {docOpen && (
        <ExportModal
          title="提案附件包（草稿）"
          filename={`${spec.title || "提案附件包"}.md`}
          markdown={docMarkdown}
          loading={docLoading}
          error={docError}
          onClose={() => setDocOpen(false)}
        />
      )}
    </div>
  )
}

interface DocumentChunk extends DocumentSection {
  content: string
}

function buildDocumentChunks(file: { text: string; pages: Array<{ num: number; text: string }> }): DocumentChunk[] {
  const pages = file.pages?.length ? file.pages : [{ num: 1, text: file.text }]
  const chunks: DocumentChunk[] = []
  let currentPages: Array<{ num: number; text: string }> = []
  let currentText = ""
  const maxChars = 7000

  for (const page of pages) {
    const pageText = page.text.trim()
    if (!pageText) continue
    if (currentText.length + pageText.length > maxChars && currentPages.length > 0) {
      chunks.push(makeChunk(chunks.length, currentPages, currentText))
      currentPages = []
      currentText = ""
    }
    currentPages.push(page)
    currentText += (currentText ? "\n\n" : "") + `第 ${page.num} 頁\n${pageText}`
  }

  if (currentPages.length > 0) chunks.push(makeChunk(chunks.length, currentPages, currentText))
  return chunks.length ? chunks : [makeChunk(0, [{ num: 1, text: file.text }], file.text)]
}

function makeChunk(index: number, pages: Array<{ num: number; text: string }>, content: string): DocumentChunk {
  const first = pages[0]?.num ?? index + 1
  const last = pages[pages.length - 1]?.num ?? first
  const range = first === last ? `第 ${first} 頁` : `第 ${first}-${last} 頁`
  return {
    id: `section-${index + 1}`,
    title: `段落 ${index + 1}`,
    range,
    status: "pending",
    excerpt: content.replace(/\s+/g, " ").slice(0, 260),
    log: ["等待分析"],
    content,
  }
}

function makeOutlineExcerpt(chunks: DocumentChunk[]) {
  return chunks
    .map((chunk, index) => `${index + 1}. ${chunk.title}（${chunk.range}）\n摘要線索：${chunk.excerpt}`)
    .join("\n\n")
    .slice(0, 14000)
}

function ensurePocScreens(spec: ProjectSpec): ProjectSpec {
  const screens = Array.isArray(spec.screens) ? spec.screens : []
  const hasRenderableComponents = screens.some((screen) => Array.isArray(screen.components) && screen.components.length > 0)
  if (hasRenderableComponents) return spec

  const requirements = (Array.isArray(spec.requirements) ? spec.requirements : []).filter((req) => req.status !== "open")
  const selected = requirements.slice(0, 6)
  if (selected.length === 0) return { ...spec, screens: [] }

  return {
    ...spec,
    screens: [
      {
        id: "fallback-poc",
        name: "招標需求對應 PoC",
        components: [
          {
            id: "fallback-heading",
            type: "heading",
            reqRef: selected[0].id,
            props: { text: spec.title || "招標需求 PoC" },
          },
          {
            id: "fallback-requirements",
            type: "table",
            reqRef: selected[0].id,
            props: {
              columns: ["需求 ID", "招標書明確需求", "來源"],
              rows: selected.map((req) => [req.id, req.statement, req.source || "來源待補"]),
            },
          },
          ...selected.slice(0, 3).map((req, index) => ({
            id: `fallback-card-${index + 1}`,
            type: "card" as const,
            reqRef: req.id,
            props: {
              title: req.id,
              body: req.statement,
              tag: req.source || "招標書需求",
            },
          })),
        ],
      },
    ],
  }
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
