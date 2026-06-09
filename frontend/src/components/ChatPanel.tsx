import { type RefObject, useEffect, useRef, useState } from "react"
import { Loader2, Mic, SendHorizonal, Upload } from "lucide-react"
import type { ChatMsg } from "@/lib/types"
import { extractFile } from "@/lib/api"
import { useSpeech } from "@/lib/useSpeech"

interface Props {
  messages: ChatMsg[]
  draft: string
  loading: boolean
  error: string | null
  inputRef: RefObject<HTMLTextAreaElement>
  onDraft: (v: string) => void
  onSend: (text: string, displayText?: string) => void
  onAnalyzeFile: (file: { filename: string; text: string; pages: Array<{ num: number; text: string }> }, userNote?: string) => void
}

export default function ChatPanel({ messages, draft, loading, error, inputRef, onDraft, onSend, onAnalyzeFile }: Props) {
  const { supported: micSupported, listening, transcript, error: micError, start, stop } = useSpeech()
  const baseRef = useRef("") // text already in the box when the mic started
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  // Stream the live transcript into the draft while listening.
  useEffect(() => {
    if (listening) onDraft((baseRef.current ? baseRef.current + " " : "") + transcript)
  }, [transcript, listening])

  function toggleMic() {
    if (listening) {
      stop()
      return
    }
    baseRef.current = draft.trim()
    start()
    inputRef.current?.focus()
  }

  function submit() {
    const t = draft.trim()
    if (!t || loading) return
    if (listening) stop()
    onSend(t)
  }

  async function importFile(file: File) {
    setFileError(null)
    setFileLoading(true)
    try {
      const extracted = await extractFile(file)
      const userNote = draft.trim()
      onDraft("")
      onAnalyzeFile({ filename: extracted.filename || file.name, text: extracted.text, pages: extracted.pages || [] }, userNote)
    } catch (e) {
      setFileError(e instanceof Error ? e.message : String(e))
    } finally {
      setFileLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              你是 SI / 接案團隊的 pre-sales 或 SA。貼上標案摘要、會議筆記或訪談逐字稿，AI 會先拆需求、標風險、追問，並生成提案用 PoC。
            </p>
            <div className="rounded-md border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-100">
              MVP 場景：準備投標／提案。輸出會聚焦需求摘要、功能與非功能需求、模糊點、驗收條件草案、提案素材與初步 WBS。
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[85%] rounded-lg px-3 py-2 text-sm " +
                (m.role === "user"
                  ? "bg-sky-600 text-white"
                  : "border border-border/60 bg-card/60 text-foreground/90")
              }
            >
              {messageText(m)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            規格與 PoC 更新中…
          </div>
        )}

        {error && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt,.md,.csv,.json,.log,application/pdf,text/plain,text/markdown,text/csv,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importFile(file)
              e.currentTarget.value = ""
            }}
          />
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={2}
            placeholder="貼上標案文件、會議筆記或訪談逐字稿，或回覆 AI 的釐清問題…（Enter 送出，Shift+Enter 換行）"
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || fileLoading}
            title="匯入 PDF / 文字型標案文件 / 會議筆記"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-input bg-background text-foreground/70 hover:bg-accent disabled:opacity-40"
          >
            {fileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleMic}
            disabled={!micSupported || loading}
            title={
              micSupported
                ? listening
                  ? "停止語音輸入"
                  : "語音輸入（中文）"
                : "此瀏覽器不支援語音輸入（建議用 Chrome）"
            }
            className={
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border " +
              (listening
                ? "animate-pulse border-rose-500 bg-rose-500/15 text-rose-300"
                : "border-input bg-background text-foreground/70 hover:bg-accent disabled:opacity-40")
            }
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            onClick={submit}
            disabled={loading || !draft.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </button>
        </div>
        {listening && <div className="mt-1.5 text-[11px] text-rose-300">● 聆聽中…再按一次麥克風停止</div>}
        {micError && <div className="mt-1.5 text-[11px] text-rose-300">{micError}</div>}
        {fileLoading && <div className="mt-1.5 text-[11px] text-sky-300">正在分析檔案…</div>}
        {fileError && <div className="mt-1.5 text-[11px] text-rose-300">{fileError}</div>}
      </div>
    </div>
  )
}

function messageText(message: ChatMsg) {
  const text = message.displayText || message.text
  if (text.length <= 1200) return text
  return text.slice(0, 1200) + "\n\n（內容已在系統內完整送出，畫面僅顯示摘要）"
}
