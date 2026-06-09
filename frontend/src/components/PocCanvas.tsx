import { useState } from "react"
import { Check, MousePointerClick, Pencil } from "lucide-react"
import type { PocComponent, ProjectSpec, Requirement } from "@/lib/types"
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
  const screens = Array.isArray(spec.screens) ? spec.screens : []
  const requirements = Array.isArray(spec.requirements) ? spec.requirements : []

  if (screens.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <MousePointerClick className="mb-3 h-10 w-10 text-sky-400/40" />
        <p className="text-sm">提案用 PoC 會在這裡長出來。</p>
        <p className="text-xs text-muted-foreground/70">貼上標案摘要或訪談逐字稿，畫面、需求與驗收條件會同步出現。</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {screens.map((screen) => (
        <div key={screen.id}>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-accent px-2 py-0.5 font-medium text-foreground/80">{screen.name}</span>
          </div>

          {/* The light "device" surface — reads as a real product preview */}
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg">
            {(Array.isArray(screen.components) ? screen.components : []).map((c) => {
              const isConfirmed = confirmedComponentIds.has(c.id)
              const isOpen = selected === c.id
              const req = requirements.find((r) => r.id === c.reqRef)
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

                  <div
                    className={
                      "pointer-events-none absolute left-2 top-2 z-20 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm " +
                      (req
                        ? "bg-sky-600 text-white"
                        : "border border-amber-300 bg-amber-50 text-amber-700")
                    }
                  >
                    {req ? `REQ ${req.id}` : "未對應需求"}
                  </div>

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
                      <RequirementTrace requirement={req} reqRef={c.reqRef} />
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
                        <Pencil className="h-4 w-4" /> 不太對，我要改
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

function RequirementTrace({ requirement, reqRef }: { requirement?: Requirement; reqRef?: string }) {
  if (!reqRef) {
    return (
      <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
        這個元件尚未綁定招標書需求，不能作為正式 PoC 依據。
      </div>
    )
  }

  if (!requirement) {
    return (
      <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
        找不到對應需求：{reqRef}
      </div>
    )
  }

  return (
    <div className="mb-2 rounded-md border border-sky-500/25 bg-sky-500/10 p-2 text-xs">
      <div className="font-medium text-sky-200">招標書需求對應</div>
      <div className="mt-1 leading-relaxed text-foreground/85">{requirement.statement}</div>
      <div className="mt-1 leading-relaxed text-muted-foreground">
        來源：{requirement.source || "來源待補"}
      </div>
    </div>
  )
}

function labelFor(c: PocComponent): string {
  const p = c.props || {}
  return p.label || p.title || p.text || p.brand || c.type
}
