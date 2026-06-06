import { type RefObject, useEffect, useRef } from "react"
import { Loader2, Mic, SendHorizonal, Sparkles } from "lucide-react"
import type { ChatMsg } from "@/lib/types"
import { STARTERS } from "@/lib/spec"
import { useSpeech } from "@/lib/useSpeech"

interface Props {
  messages: ChatMsg[]
  draft: string
  loading: boolean
  error: string | null
  inputRef: RefObject<HTMLTextAreaElement>
  onDraft: (v: string) => void
  onSend: (text: string) => void
}

export default function ChatPanel({ messages, draft, loading, error, inputRef, onDraft, onSend }: Props) {
  const { supported: micSupported, listening, transcript, error: micError, start, stop } = useSpeech()
  const baseRef = useRef("") // text already in the box when the mic started

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              你是開標方 / 提解法方。講一句你想要的東西——越口語、越模糊都沒關係，AI 會幫你問清楚。
            </p>
            <div className="space-y-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  disabled={loading}
                  onClick={() => onSend(s)}
                  className="flex w-full items-start gap-2 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-left text-sm text-foreground/80 hover:border-sky-500/40 hover:bg-sky-500/5 disabled:opacity-50"
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                  {s}
                </button>
              ))}
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
              {m.text}
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
            placeholder="講一句需求，或回覆 AI 的釐清問題…（Enter 送出，Shift+Enter 換行）"
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
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
      </div>
    </div>
  )
}
