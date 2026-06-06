import type { PocComponent } from "@/lib/types"

// Renders one IR component as a realistic, light-themed website element.
// Purely presentational — clicking / confirmation is handled by the wrapper in
// PocCanvas. Inputs are non-interactive (it's a prototype, not a live app).
export default function ComponentRenderer({ c }: { c: PocComponent }) {
  const p = c.props || {}
  switch (c.type) {
    case "navbar":
      return (
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="font-bold text-slate-800">{p.brand || "Logo"}</div>
          <div className="flex gap-4 text-sm text-slate-500">
            {(p.links || []).map((l: string, i: number) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        </div>
      )

    case "hero":
      return (
        <div className="px-6 py-10 text-center bg-gradient-to-b from-sky-50 to-white">
          <h1 className="text-2xl font-bold text-slate-900">{p.title || "標題"}</h1>
          {p.subtitle && <p className="mt-2 text-slate-500">{p.subtitle}</p>}
          {p.ctaLabel && (
            <div className="mt-4">
              <span className="inline-block rounded-md bg-sky-600 px-5 py-2 text-sm font-medium text-white">
                {p.ctaLabel}
              </span>
            </div>
          )}
        </div>
      )

    case "heading":
      return <h2 className="px-5 pt-4 text-lg font-semibold text-slate-800">{p.text}</h2>

    case "text":
      return <p className="px-5 py-1 text-sm leading-relaxed text-slate-600">{p.text}</p>

    case "field":
      return (
        <div className="px-5 py-2">
          {p.label && <div className="mb-1 text-sm font-medium text-slate-700">{p.label}</div>}
          {p.fieldType === "textarea" ? (
            <div className="h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-400">
              {p.placeholder || ""}
            </div>
          ) : (
            <div className="flex h-9 w-full items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-400">
              {p.placeholder || (p.fieldType === "date" ? "yyyy / mm / dd" : "")}
            </div>
          )}
        </div>
      )

    case "select":
      return (
        <div className="px-5 py-2">
          {p.label && <div className="mb-1 text-sm font-medium text-slate-700">{p.label}</div>}
          <div className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-500">
            <span>{(p.options && p.options[0]) || "請選擇"}</span>
            <span className="text-slate-400">▾</span>
          </div>
        </div>
      )

    case "timeslots":
      return (
        <div className="px-5 py-2">
          {p.label && <div className="mb-2 text-sm font-medium text-slate-700">{p.label}</div>}
          <div className="flex flex-wrap gap-2">
            {(p.slots || []).map((s: string, i: number) => (
              <span
                key={i}
                className={
                  "rounded-md border px-3 py-1.5 text-sm " +
                  (i === 1
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-300 bg-white text-slate-600")
                }
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )

    case "calendar":
      return (
        <div className="px-5 py-2">
          {p.label && <div className="mb-2 text-sm font-medium text-slate-700">{p.label}</div>}
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="mb-2 text-center text-sm font-medium text-slate-700">{p.month || "2026 年 6 月"}</div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                <div key={d} className="py-1 text-slate-400">
                  {d}
                </div>
              ))}
              {Array.from({ length: 30 }, (_, i) => (
                <div
                  key={i}
                  className={
                    "rounded py-1 " +
                    (i === 14 ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100")
                  }
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case "button":
      return (
        <div className="px-5 py-2">
          <span
            className={
              "inline-block rounded-md px-5 py-2 text-sm font-medium " +
              (p.variant === "secondary"
                ? "border border-slate-300 bg-white text-slate-700"
                : "bg-sky-600 text-white")
            }
          >
            {p.text || "按鈕"}
          </span>
        </div>
      )

    case "card":
      return (
        <div className="px-5 py-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-800">{p.title}</div>
              {p.tag && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{p.tag}</span>
              )}
            </div>
            {p.body && <div className="mt-1 text-sm text-slate-500">{p.body}</div>}
          </div>
        </div>
      )

    case "list":
      return (
        <div className="px-5 py-2">
          {p.title && <div className="mb-1 text-sm font-medium text-slate-700">{p.title}</div>}
          <ul className="space-y-1">
            {(p.items || []).map((it: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                {it}
              </li>
            ))}
          </ul>
        </div>
      )

    case "table":
      return (
        <div className="px-5 py-2">
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {(p.columns || []).map((col: string, i: number) => (
                    <th key={i} className="px-3 py-2 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(p.rows || []).map((row: string[], ri: number) => (
                  <tr key={ri} className="border-t border-slate-100 text-slate-600">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

    case "steps":
      return (
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          {(p.items || []).map((it: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className={
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs " +
                  (i <= (p.current ?? 0) ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-500")
                }
              >
                {i + 1}
              </span>
              <span className="text-sm text-slate-600">{it}</span>
              {i < (p.items || []).length - 1 && <span className="mx-1 text-slate-300">›</span>}
            </div>
          ))}
        </div>
      )

    case "stat":
      return (
        <div className="px-5 py-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">{p.label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{p.value}</div>
            {p.sub && <div className="text-xs text-slate-400">{p.sub}</div>}
          </div>
        </div>
      )

    case "badge":
      return (
        <div className="px-5 py-1">
          <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
            {p.text}
          </span>
        </div>
      )

    case "notice": {
      const tone = p.tone || "info"
      const cls =
        tone === "warn"
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : tone === "success"
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-sky-300 bg-sky-50 text-sky-700"
      return (
        <div className="px-5 py-2">
          <div className={"rounded-md border px-3 py-2 text-sm " + cls}>{p.text}</div>
        </div>
      )
    }

    case "divider":
      return <div className="mx-5 my-2 border-t border-slate-200" />

    case "image":
      return (
        <div className="px-5 py-2">
          <div className="flex h-32 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
            🖼 {p.caption || "圖片"}
          </div>
        </div>
      )

    default:
      return null
  }
}
