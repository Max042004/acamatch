import { useState } from "react"
import { Copy, Download, Loader2, X } from "lucide-react"

interface Props {
  title: string
  filename: string
  markdown: string | null
  loading: boolean
  error: string | null
  onClose: () => void
}

// Preview for the generated 需求規格書 / 標書草稿. Dependency-free: shows the raw
// Markdown in a scrollable pane with copy + download. The download is the real
// deliverable; the preview is the demo beat ("看，標書草稿剛剛長出來了").
export default function ExportModal({ title, filename, markdown, loading, error, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!markdown) return
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function download() {
    if (!markdown) return
    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="text-sm font-semibold">{title}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              disabled={!markdown}
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "已複製" : "複製"}
            </button>
            <button
              onClick={download}
              disabled={!markdown}
              className="flex items-center gap-1.5 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs text-white disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              下載 .md
            </button>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mb-3 h-6 w-6 animate-spin text-sky-400" />
              正在從已確認的規格產生標書草稿…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
              {error}
            </div>
          )}
          {!loading && !error && markdown && (
            <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-foreground/90">
              {markdown}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
