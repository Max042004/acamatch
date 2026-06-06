import { useState } from "react"
import { Check, MousePointerClick } from "lucide-react"
import type { PocComponent, ProjectSpec } from "@/lib/types"
import ComponentRenderer from "./ComponentRenderer"

interface Props {
  spec: ProjectSpec
  confirmedComponentIds: Set<string>
  loading: boolean
  onConfirm: (c: PocComponent) => void
  onReject: (c: PocComponent) => void
}

// The live PoC. Every component is clickable: the user can't write a clean spec,
// but they can look at a screen and say "this bit's OK / this bit's wrong".
// Confirming a piece sinks it into the 規格; rejecting it kicks off a chat turn.
export default function PocCanvas({ spec, confirmedComponentIds, loading, onConfirm, onReject }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  if (spec.screens.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <MousePointerClick className="mb-3 h-10 w-10 text-sky-400/40" />
        <p className="text-sm">PoC 會在這裡長出來。</p>
        <p className="text-xs text-muted-foreground/70">在下方對話框講一句需求，畫面與規格會同步出現。</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {spec.screens.map((screen) => (
        <div key={screen.id}>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-accent px-2 py-0.5 font-medium text-foreground/80">{screen.name}</span>
          </div>

          {/* The light "device" surface — reads as a real product preview */}
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg">
            {screen.components.map((c) => {
              const isConfirmed = confirmedComponentIds.has(c.id)
              const isOpen = selected === c.id
              return (
                <div
                  key={c.id}
                  className="group relative cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelected(isOpen ? null : c.id)
                  }}
                >
                  {/* hover / selected / confirmed highlight */}
                  <div
                    className={
                      "pointer-events-none absolute inset-0 z-10 rounded-sm transition " +
                      (isConfirmed
                        ? "ring-2 ring-inset ring-emerald-400/70"
                        : isOpen
                          ? "ring-2 ring-inset ring-sky-500"
                          : "ring-0 group-hover:ring-2 group-hover:ring-inset group-hover:ring-sky-300")
                    }
                  />

                  {isConfirmed && (
                    <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white">
                      <Check className="h-3 w-3" /> 已確認
                    </div>
                  )}

                  <ComponentRenderer c={c} />

                  {isOpen && (
                    <div
                      className="absolute right-3 top-3 z-30 w-52 rounded-lg border border-border bg-popover p-2 text-left shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-1 pb-2 text-xs text-muted-foreground">
                        這塊（{labelFor(c)}）
                        {c.reqRef && <span className="text-sky-400"> · 連到 {c.reqRef}</span>}
                      </div>
                      <button
                        className="mb-1 flex w-full items-center gap-2 rounded-md bg-emerald-500/15 px-2.5 py-2 text-sm text-emerald-300 hover:bg-emerald-500/25"
                        onClick={() => {
                          onConfirm(c)
                          setSelected(null)
                        }}
                      >
                        <Check className="h-4 w-4" /> 這樣 OK，記進規格
                      </button>
                      <button
                        className="flex w-full items-center gap-2 rounded-md bg-accent px-2.5 py-2 text-sm text-foreground/80 hover:bg-accent/70"
                        disabled={loading}
                        onClick={() => {
                          onReject(c)
                          setSelected(null)
                        }}
                      >
                        ✏️ 不太對，我要改
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function labelFor(c: PocComponent): string {
  const p = c.props || {}
  return p.label || p.title || p.text || p.brand || c.type
}
