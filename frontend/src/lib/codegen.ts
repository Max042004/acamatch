import type { PocComponent, ProjectSpec } from "./types"

// Deterministic IR → standalone HTML. No LLM: the structured model we've been
// building IS the deliverable — one function turns it into a real, openable page.
// This is the demo's closing beat: "確認完規格，一鍵就有真程式碼。"

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const arr = <T>(x: T[] | undefined | null): T[] => (Array.isArray(x) ? x : [])

function renderComponent(c: PocComponent): string {
  const p = c.props || {}
  switch (c.type) {
    case "navbar":
      return `<div class="navbar"><div class="brand">${esc(p.brand || "Logo")}</div><div class="links">${arr<string>(p.links)
        .map((l) => `<span>${esc(l)}</span>`)
        .join("")}</div></div>`
    case "hero":
      return `<div class="hero"><h1>${esc(p.title)}</h1>${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ""}${
        p.ctaLabel ? `<div><span class="btn">${esc(p.ctaLabel)}</span></div>` : ""
      }</div>`
    case "heading":
      return `<h2 class="heading">${esc(p.text)}</h2>`
    case "text":
      return `<p class="text">${esc(p.text)}</p>`
    case "field":
      return `<div class="field"><div class="label">${esc(p.label || "")}</div>${
        p.fieldType === "textarea"
          ? `<div class="input textarea">${esc(p.placeholder || "")}</div>`
          : `<div class="input">${esc(p.placeholder || (p.fieldType === "date" ? "yyyy / mm / dd" : ""))}</div>`
      }</div>`
    case "select":
      return `<div class="field"><div class="label">${esc(p.label || "")}</div><div class="input select"><span>${esc(
        (arr<string>(p.options)[0]) || "請選擇",
      )}</span><span class="caret">▾</span></div></div>`
    case "timeslots":
      return `<div class="field">${p.label ? `<div class="label">${esc(p.label)}</div>` : ""}<div class="chips">${arr<string>(
        p.slots,
      )
        .map((s, i) => `<span class="chip${i === 1 ? " chip-on" : ""}">${esc(s)}</span>`)
        .join("")}</div></div>`
    case "calendar": {
      const days = ["日", "一", "二", "三", "四", "五", "六"]
        .map((d) => `<div class="cal-h">${d}</div>`)
        .join("")
      const cells = Array.from({ length: 30 }, (_, i) => `<div class="cal-d${i === 14 ? " cal-on" : ""}">${i + 1}</div>`).join("")
      return `<div class="field">${p.label ? `<div class="label">${esc(p.label)}</div>` : ""}<div class="cal"><div class="cal-m">${esc(
        p.month || "2026 年 6 月",
      )}</div><div class="cal-grid">${days}${cells}</div></div></div>`
    }
    case "button":
      return `<div class="field"><span class="btn${p.variant === "secondary" ? " btn-sec" : ""}">${esc(p.text || "按鈕")}</span></div>`
    case "card":
      return `<div class="field"><div class="card"><div class="card-top"><span class="card-title">${esc(
        p.title,
      )}</span>${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ""}</div>${
        p.body ? `<div class="card-body">${esc(p.body)}</div>` : ""
      }</div></div>`
    case "list":
      return `<div class="field">${p.title ? `<div class="label">${esc(p.title)}</div>` : ""}<ul class="list">${arr<string>(
        p.items,
      )
        .map((it) => `<li>${esc(it)}</li>`)
        .join("")}</ul></div>`
    case "table":
      return `<div class="field"><table class="table"><thead><tr>${arr<string>(p.columns)
        .map((col) => `<th>${esc(col)}</th>`)
        .join("")}</tr></thead><tbody>${arr<string[]>(p.rows)
        .map((row) => `<tr>${arr<string>(row).map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></div>`
    case "steps":
      return `<div class="steps">${arr<string>(p.items)
        .map(
          (it, i) =>
            `<span class="step${i <= (p.current ?? 0) ? " step-on" : ""}">${i + 1}</span><span class="step-label">${esc(
              it,
            )}</span>${i < arr<string>(p.items).length - 1 ? `<span class="step-sep">›</span>` : ""}`,
        )
        .join("")}</div>`
    case "stat":
      return `<div class="field"><div class="stat"><div class="stat-l">${esc(p.label)}</div><div class="stat-v">${esc(
        p.value,
      )}</div>${p.sub ? `<div class="stat-s">${esc(p.sub)}</div>` : ""}</div></div>`
    case "badge":
      return `<div class="field"><span class="badge">${esc(p.text)}</span></div>`
    case "notice": {
      const tone = p.tone === "warn" ? "warn" : p.tone === "success" ? "success" : "info"
      return `<div class="field"><div class="notice notice-${tone}">${esc(p.text)}</div></div>`
    }
    case "divider":
      return `<hr class="divider" />`
    case "image":
      return `<div class="field"><div class="img">🖼 ${esc(p.caption || "圖片")}</div></div>`
    default:
      return ""
  }
}

const STYLES = `
*{box-sizing:border-box}
body{margin:0;background:#0c1322;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"PingFang TC","Noto Sans TC",sans-serif;padding:28px}
.head{max-width:720px;margin:0 auto 20px}
.head h1{font-size:20px;margin:0}
.head p{color:#94a3b8;font-size:13px;margin:4px 0 0}
.screen{max-width:720px;margin:0 auto 28px}
.screen-name{font-size:12px;color:#94a3b8;margin-bottom:8px}
.device{background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.navbar{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding:12px 20px}
.navbar .brand{font-weight:700;color:#1e293b}
.navbar .links{display:flex;gap:16px;font-size:14px;color:#64748b}
.hero{padding:40px 24px;text-align:center;background:linear-gradient(#f0f9ff,#fff)}
.hero h1{font-size:22px;margin:0;color:#0f172a}
.hero p{margin:8px 0 0;color:#64748b}
.hero>div{margin-top:16px}
.heading{padding:16px 20px 0;font-size:18px;color:#1e293b}
.text{padding:4px 20px;font-size:14px;color:#475569;line-height:1.6}
.field{padding:8px 20px}
.label{font-size:14px;font-weight:500;color:#334155;margin-bottom:4px}
.input{display:flex;align-items:center;height:36px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;padding:0 12px;font-size:14px;color:#94a3b8}
.input.textarea{height:80px;align-items:flex-start;padding-top:8px}
.input.select{justify-content:space-between;color:#64748b}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:6px;padding:6px 12px;font-size:14px}
.chip-on{border-color:#0ea5e9;background:#f0f9ff;color:#0369a1}
.cal{border:1px solid #e2e8f0;border-radius:6px;background:#fff;padding:12px}
.cal-m{text-align:center;font-size:14px;font-weight:500;color:#334155;margin-bottom:8px}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;font-size:12px}
.cal-h{color:#94a3b8;padding:4px 0}
.cal-d{padding:4px 0;border-radius:4px;color:#475569}
.cal-on{background:#0284c7;color:#fff}
.btn{display:inline-block;background:#0284c7;color:#fff;border-radius:6px;padding:8px 20px;font-size:14px;font-weight:500}
.btn-sec{background:#fff;color:#334155;border:1px solid #cbd5e1}
.card{border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.card-top{display:flex;justify-content:space-between;align-items:center}
.card-title{font-weight:600;color:#1e293b}
.tag{background:#f1f5f9;color:#64748b;border-radius:999px;padding:2px 8px;font-size:12px}
.card-body{margin-top:4px;font-size:14px;color:#64748b}
.list{margin:0;padding-left:18px;color:#475569;font-size:14px;line-height:1.7}
.table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;font-size:14px}
.table th{background:#f8fafc;color:#64748b;text-align:left;padding:8px 12px;font-weight:500}
.table td{border-top:1px solid #f1f5f9;color:#475569;padding:8px 12px}
.steps{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:14px 20px}
.step{display:inline-flex;width:24px;height:24px;align-items:center;justify-content:center;border-radius:999px;background:#e2e8f0;color:#64748b;font-size:12px}
.step-on{background:#0284c7;color:#fff}
.step-label{font-size:14px;color:#475569}
.step-sep{color:#cbd5e1;margin:0 4px}
.stat{border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:16px}
.stat-l{font-size:12px;color:#64748b}
.stat-v{font-size:24px;font-weight:700;color:#0f172a;margin-top:4px}
.stat-s{font-size:12px;color:#94a3b8}
.badge{display:inline-block;background:#e0f2fe;color:#0369a1;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:500}
.notice{border-radius:6px;padding:8px 12px;font-size:14px;border:1px solid}
.notice-info{border-color:#7dd3fc;background:#f0f9ff;color:#0369a1}
.notice-warn{border-color:#fcd34d;background:#fffbeb;color:#b45309}
.notice-success{border-color:#6ee7b7;background:#ecfdf5;color:#047857}
.divider{margin:8px 20px;border:0;border-top:1px solid #e2e8f0}
.img{display:flex;height:128px;align-items:center;justify-content:center;border-radius:6px;background:#f1f5f9;color:#94a3b8;font-size:12px}
.foot{max-width:720px;margin:24px auto 0;font-size:11px;color:#64748b}
`

export function specToHtml(spec: ProjectSpec): string {
  const screens = arr(spec.screens)
    .map(
      (s) =>
        `<section class="screen"><div class="screen-name">${esc(s.name)}</div><div class="device">${arr(s.components)
          .map(renderComponent)
          .join("")}</div></section>`,
    )
    .join("\n")

  return `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(spec.title || "PoC")}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="head"><h1>${esc(spec.title || "PoC")}</h1><p>${esc(spec.one_liner || "")}</p></div>
${screens}
<div class="foot">由 Spec Cockpit 從已確認的需求模型自動產生 · PoC 程式碼草稿</div>
</body>
</html>`
}
