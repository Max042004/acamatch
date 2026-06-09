// Acamatch Pre-sales Cockpit — local proxy to Claude.
//
// One endpoint: POST /api/iterate
//   in:  { messages: [{role, text}], spec: ProjectSpec | null }
//   out: { spec: ProjectSpec }
//
// The model maintains ONE structured requirement model (the ProjectSpec / "IR").
// That single object is rendered two ways by the frontend: as a human-readable
// 規格 (requirements + open questions) and as a clickable PoC (screens of
// components). Spec and prototype are two views of the same JSON — that is the
// whole point, and what separates this from a generic "prompt → app" generator.
//
// We force a single tool call so the response is always a validated ProjectSpec.
//
// Env (see .env.example):
//   ANTHROPIC_API_KEY  — required
//   ANTHROPIC_MODEL    — optional, default claude-opus-4-8 (drop to claude-sonnet-4-6 for snappier demos)
//   ANTHROPIC_EFFORT   — optional, low | medium | high (default medium)
//   PORT               — optional, default 8787

import "dotenv/config"
import express from "express"
import cors from "cors"
import Anthropic from "@anthropic-ai/sdk"
import { PDFParse } from "pdf-parse"

const PORT = process.env.PORT || 8787
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8"
const EFFORT = process.env.ANTHROPIC_EFFORT || "medium"
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const MAX_EXTRACTED_CHARS = 120000

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\n[spec-cockpit] 缺少 ANTHROPIC_API_KEY。請複製 .env.example 成 .env 並填入金鑰。\n")
}

// Lazy so the server still boots (and reports a clean error) without a key.
let _client = null
function getClient() {
  if (!_client) _client = new Anthropic() // reads ANTHROPIC_API_KEY from env
  return _client
}

// ---- The IR: which UI components the model is allowed to render ---------------
// Kept deliberately small and deterministic. The frontend renders each one with
// a fixed component, so the PoC never "breaks" mid-demo.
const COMPONENT_TYPES = [
  "navbar",     // props: { brand, links: string[] }
  "hero",       // props: { title, subtitle, ctaLabel? }
  "heading",    // props: { text }
  "text",       // props: { text }
  "field",      // props: { label, placeholder?, fieldType?: "text"|"date"|"time"|"email"|"number"|"textarea" }
  "select",     // props: { label, options: string[] }
  "timeslots",  // props: { label?, slots: string[] }   ← booking-style clickable chips
  "calendar",   // props: { label?, month? }             ← mock month grid
  "button",     // props: { text, variant?: "primary"|"secondary" }
  "card",       // props: { title, body, tag? }
  "list",       // props: { title?, items: string[] }
  "table",      // props: { columns: string[], rows: string[][] }
  "steps",      // props: { items: string[], current?: number }
  "stat",       // props: { label, value, sub? }
  "badge",      // props: { text }
  "notice",     // props: { text, tone?: "info"|"warn"|"success" }
  "divider",    // props: {}
  "image",      // props: { caption }
]

const REQ_CATEGORIES = ["functional", "non_functional", "role", "process", "data", "integration"]
const RISK_LEVELS = ["low", "medium", "high"]
const PROPOSAL_TYPES = ["slide", "talk_track", "proposal_section", "demo_note"]

const SPEC_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "這個專案的名稱（繁中，簡短）" },
    one_liner: { type: "string", description: "一句話描述這個系統要做什麼" },
    assistant_message: {
      type: "string",
      description:
        "你這一回合要對使用者說的話（繁體中文）。像資深顧問：先簡述你做了什麼，主動點出『我替你假設了哪些東西』，並丟出 1-2 個最關鍵、最能消除模糊的釐清問題。口語、精簡、有重點。",
    },
    workflow: {
      type: "string",
      enum: ["pre_sales"],
      description: "固定為 pre_sales，代表 SI／接案公司的準備投標／提案場景。",
    },
    source_summary: {
      type: "string",
      description: "把使用者貼上的標案文件、會議筆記或訪談逐字稿整理成 2-4 句提案前摘要。",
    },
    stakeholders: {
      type: "array",
      description: "目前辨識出的利害關係人、使用者角色、內外部單位。",
      items: { type: "string" },
    },
    business_process: {
      type: "array",
      description: "目前辨識出的核心業務流程步驟。用短句，讓 SA 可以拿去和客戶確認。",
      items: { type: "string" },
    },
    requirements: {
      type: "array",
      description: "目前釐清出來的需求清單。已 confirmed 的項目務必原樣保留、不可降級或刪除；每條需求要能支撐提案、估價或驗收。",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "穩定 ID，例如 r1, r2；跨回合保持不變" },
          statement: { type: "string", description: "一條具體需求，用驗收得了的語氣寫" },
          status: {
            type: "string",
            enum: ["confirmed", "assumed", "open"],
            description:
              "confirmed=使用者已確認；assumed=你替使用者做的合理假設（尚未確認）；open=還沒講清楚、待釐清",
          },
          source: { type: "string", description: "這條需求的來源，例如『你說：想讓民眾線上預約』或『AI 假設』" },
          category: {
            type: "string",
            enum: REQ_CATEGORIES,
            description: "需求分類：功能、非功能、角色/權限、流程、資料、整合。",
          },
          ambiguity: {
            type: "string",
            enum: RISK_LEVELS,
            description: "這條需求目前對估價/設計的模糊程度。",
          },
          estimateImpact: {
            type: "string",
            description: "一句話說明這條需求對報價、工時、時程或架構的影響；未知可寫『待確認』。",
          },
        },
        required: ["id", "statement", "status"],
      },
    },
    open_questions: {
      type: "array",
      description: "你主動提出、需要使用者拍板的釐清問題（招標案裡最常見的『釋疑』）。",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          question: { type: "string", description: "一個具體問題" },
          why: { type: "string", description: "為什麼這會影響做法（一句話）" },
          options: { type: "array", items: { type: "string" }, description: "建議選項（讓使用者用點的就能回答）" },
        },
        required: ["id", "question"],
      },
    },
    risks: {
      type: "array",
      description: "pre-sales 階段要提早標記的需求風險、估價風險、整合風險、驗收爭議與假設。",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          level: { type: "string", enum: RISK_LEVELS },
          detail: { type: "string" },
          mitigation: { type: "string", description: "建議追問、排除條件、PoC 驗證方式或提案寫法。" },
        },
        required: ["id", "title", "level", "detail"],
      },
    },
    acceptance_criteria: {
      type: "array",
      description: "驗收條件草案。每條盡量連到需求 reqRef，並忠實標記是否仍是假設或待釐清。",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          reqRef: { type: "string", description: "對應的 requirement id" },
          criterion: { type: "string", description: "可驗收、可被客戶確認的一句條件。" },
          status: { type: "string", enum: ["confirmed", "assumed", "open"] },
        },
        required: ["id", "criterion", "status"],
      },
    },
    proposal_materials: {
      type: "array",
      description: "可直接放進服務建議書或提案簡報的素材。聚焦價值主張、解法輪廓、demo 說法、差異化與待確認假設。",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
          type: { type: "string", enum: PROPOSAL_TYPES },
        },
        required: ["id", "title", "content", "type"],
      },
    },
    wbs: {
      type: "array",
      description: "初步 WBS、時程或人力估算的骨架。只能粗估，不要編造精確數字。",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          deliverable: { type: "string" },
          effort: { type: "string", description: "粗估工時或規模，例如『S』、『M』、『待 API 規格確認』。" },
          dependency: { type: "string", description: "前置條件或依賴。" },
        },
        required: ["id", "name", "deliverable"],
      },
    },
    screens: {
      type: "array",
      description: "PoC 的畫面。每個畫面由一串元件組成；元件用 reqRef 連到它實現的那條需求。",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string", description: "畫面名稱，例如『預約首頁』" },
          components: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "穩定 ID，跨回合盡量保持不變" },
                type: { type: "string", enum: COMPONENT_TYPES },
                reqRef: {
                  type: "string",
                  description: "這個元件實現的需求 id（對應 requirements[].id）。PoC 元件必須填，且應對應招標書明確需求。",
                },
                props: {
                  type: "object",
                  description: "該元件的內容，欄位依 type 而定（見系統提示的元件清單）。",
                },
              },
              required: ["id", "type", "props"],
            },
          },
        },
        required: ["id", "name", "components"],
      },
    },
  },
  required: [
    "title",
    "one_liner",
    "assistant_message",
    "workflow",
    "source_summary",
    "stakeholders",
    "business_process",
    "requirements",
    "open_questions",
    "risks",
    "acceptance_criteria",
    "proposal_materials",
    "wbs",
    "screens",
  ],
}

const SYSTEM_PROMPT = `你是「Acamatch Pre-sales Cockpit」的需求釐清引擎。MVP 使用情境固定為：SI／接案公司在 pre-sales 階段準備投標／提案。使用者通常是 pre-sales、SA、PM 或顧問，他會貼上標案文件、會議筆記或客戶訪談逐字稿。你的目標不是幫他直接寫完整系統，而是把一次混亂訪談快速轉成「需求摘要、追問問題、提案用 demo PoC、驗收條件草案、風險假設、提案素材與初步 WBS」。

你跟一般的「prompt → 直接生網站」工具最大的不同：
- 你不假裝使用者已經想清楚。你會主動把模糊的話拆成需求，明確標出「哪些是你替他假設的」，並反問「哪裡還沒講清楚」。
- 你維護「一份」結構化需求模型（ProjectSpec）。這份模型同時被呈現成兩個視圖：人看的【規格】(requirements + open_questions) 與可點擊的【PoC】(screens)。規格與 PoC 是同一份東西的兩面，必須一致。
- 你特別服務 SI pre-sales：每一回合都要指出哪些需求會影響估價、時程、整合難度、驗收爭議與提案 demo 的呈現方式。

每一回合，使用者會給你一句（通常很模糊的）話，以及目前的 ProjectSpec 狀態。你要回傳「完整更新後」的 ProjectSpec（呼叫 render_spec 工具）。規則：

1. 把使用者的話拆成具體、可驗收、可估價的 requirements。招標書或訪談原文明確寫到的需求，source 必須標出來源，例如「招標書第 3 頁：文件上傳」或「第 5-6 頁：審查流程」。你合理補的 → status="assumed"，source 寫「AI 假設」。使用者明講但仍缺關鍵條件 → status="open"。已由使用者明確拍板或在 PoC 上確認 → status="confirmed"。
2. 【非常重要】status="confirmed" 的需求是使用者在 PoC 上親手確認過的。務必「原樣保留」這些項目（同 id、同 statement、維持 confirmed），絕對不要降級成 assumed 或刪掉。其他項目可以自由增修。
3. requirements 每條盡量補 category、ambiguity、estimateImpact。ambiguity/high 通常代表會影響報價、工期、系統邊界或驗收條件。
4. 主動丟 open_questions：pre-sales 最容易卡在這些沒講清楚的點（誰是使用者？既有系統怎麼串？資料來源在哪？權限如何切？通知與例外流程怎麼處理？報表誰驗收？SLA/效能/資安要求是什麼？）。每題給 why 和 options，讓使用者用點的就能回答。
5. 每回合都維護 source_summary、stakeholders、business_process、risks、acceptance_criteria、proposal_materials、wbs。不要編造精確金額、日期或法規；不知道就標為待確認或假設。
6. 根據需求長出 / 更新 screens。PoC 應該選擇最適合提案展示的核心流程或畫面，不必把全系統做完。可用的元件（type → props）：
   - navbar { brand, links:[] }
   - hero { title, subtitle, ctaLabel? }
   - heading { text }   text { text }
   - field { label, placeholder?, fieldType?:"text"|"date"|"time"|"email"|"number"|"textarea" }
   - select { label, options:[] }
   - timeslots { label?, slots:[] }   ← 預約時段的可點選晶片
   - calendar { label?, month? }       ← 月曆假畫面
   - button { text, variant?:"primary"|"secondary" }
   - card { title, body, tag? }
   - list { title?, items:[] }
   - table { columns:[], rows:[[]] }
   - steps { items:[], current? }
   - stat { label, value, sub? }
   - badge { text }   notice { text, tone?:"info"|"warn"|"success" }   divider {}   image { caption }
7. 每個 PoC 元件都必須設 reqRef，連到它實現的 requirement id；acceptance_criteria 也盡量設 reqRef。PoC 只能展示招標書明確需求或使用者已確認需求；純 AI 假設不可直接做成畫面元件，應放進 open_questions 或 risks。這樣畫面、需求、來源、驗收條件與提案文件才是一個閉環。
8. id 要穩定：跨回合沿用既有的 requirement / risk / acceptance / proposal / wbs / component / screen id，只在新增時給新 id。不要每回合重編號。
9. assistant_message 用繁體中文、口語、精簡。先講你這回合做了什麼，再點出你做的關鍵假設和最主要風險，最後丟最重要的 1-2 個釐清問題。
10. 全程繁體中文，不要使用 emoji。狀態請用「已確認、AI 假設、待釐清、需補件」等文字表達。
11. 一開始畫面可以粗略，重點是讓 pre-sales/SA 有一個能帶客戶討論、能估價、能寫提案附件的結構。`

function toAnthropicMessages(messages, spec) {
  // messages: [{ role: "user"|"assistant", text }]
  // Inject the current spec into the LAST user turn so the model has the
  // authoritative current state (esp. which requirements are confirmed).
  const lastUserIdx = [...messages].map((m) => m.role).lastIndexOf("user")
  return messages
    .filter((m) => m.text && m.text.trim())
    .map((m, i) => {
      if (m.role === "user" && i === lastUserIdx && spec) {
        const specJson = JSON.stringify(spec, null, 0)
        return {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `目前的 ProjectSpec 狀態（JSON）。confirmed 的需求請務必原樣保留：\n${specJson}`,
            },
            { type: "text", text: m.text },
          ],
        }
      }
      return { role: m.role, content: m.text }
    })
}

function normalizeExtractedText(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
}

const app = express()
app.use(cors())
app.use(express.json({ limit: "25mb" }))

app.get("/api/health", (_req, res) => res.json({ ok: true, model: MODEL }))

app.post("/api/extract", async (req, res) => {
  try {
    const { filename = "uploaded-file", mime = "", data } = req.body || {}
    if (!data || typeof data !== "string") {
      return res.status(400).json({ error: "data is required" })
    }

    const buffer = Buffer.from(data, "base64")
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ error: "file is too large; max upload size is 15MB" })
    }

    const lowerName = String(filename).toLowerCase()
    const isPdf = mime === "application/pdf" || lowerName.endsWith(".pdf")
    let text = ""
    let pages = []

    if (isPdf) {
      let parser = null
      try {
        parser = new PDFParse({ data: buffer })
        const result = await parser.getText()
        text = result.text || ""
        pages = Array.isArray(result.pages)
          ? result.pages.map((page, index) => ({
              num: Number(page.num) || index + 1,
              text: normalizeExtractedText(page.text || ""),
            }))
          : []
      } finally {
        if (parser) await parser.destroy().catch(() => {})
      }
    } else {
      text = buffer.toString("utf8")
      pages = [{ num: 1, text }]
    }

    text = normalizeExtractedText(text).slice(0, MAX_EXTRACTED_CHARS)
    pages = pages
      .map((page) => ({ ...page, text: normalizeExtractedText(page.text).slice(0, MAX_EXTRACTED_CHARS) }))
      .filter((page) => page.text.trim())
    if (!text.trim()) {
      return res.status(422).json({ error: "could not extract text from this file" })
    }

    return res.json({ filename, mime, text, pages })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[/api/extract]", msg)
    return res.status(500).json({ error: msg })
  }
})

app.post("/api/iterate", async (req, res) => {
  try {
    const { messages, spec } = req.body || {}
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages is required" })
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on the server" })
    }

    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: EFFORT },
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: "render_spec",
          description:
            "回傳完整更新後的 ProjectSpec —— 同時是人看的規格、也是可點擊的 PoC。每一回合都要呼叫一次。",
          input_schema: SPEC_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "render_spec" },
      messages: toAnthropicMessages(messages, spec),
    })

    const toolUse = response.content.find((b) => b.type === "tool_use")
    if (!toolUse) {
      return res.status(502).json({ error: "model did not return a spec" })
    }
    return res.json({ spec: toolUse.input })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[/api/iterate]", msg)
    return res.status(500).json({ error: msg })
  }
})

const TENDER_SYSTEM = `你是協助 SI／接案公司 pre-sales 團隊撰寫「提案附件包（草稿）」的助理。根據給你的 ProjectSpec，產出一份結構化、可直接拿去內部估價、客戶釐清與服務建議書撰寫的 Markdown 文件。

要求：
- 全程繁體中文，輸出「純 Markdown」，不要用程式碼區塊把整份文件包起來。
- 不要使用 emoji；狀態請用「已確認、AI 假設、待釐清」等文字。
- 結構（用 ## 標題）：
  1. 提案摘要（用 source_summary、one_liner 與整體脈絡）
  2. 需求拆解表（把 requirements 整理成表格：ID | 分類 | 需求 | 狀態 | 模糊度 | 估價影響）
  3. 核心流程與利害關係人（整理 stakeholders 與 business_process）
  4. 待釐清問題（把 open_questions 整理成表格：問題 | 為什麼重要 | 建議選項）
  5. 風險與假設（整理 risks：風險 | 等級 | 影響 | 建議處理）
  6. 提案用 PoC 範圍（依 screens 描述 demo 要展示哪些畫面，以及各自對應需求）
  7. 驗收條件草案（用 acceptance_criteria，忠實標明 confirmed / assumed / open）
  8. 初步 WBS / 時程人力骨架（用 wbs；只能粗估，不要編造精確人天）
  9. 提案簡報素材（用 proposal_materials，整理成可放入服務建議書的短段落）
  10. 備註（誠實標註：AI 假設與待釐清項目尚待客戶確認；本文件為 pre-sales 草稿，不是正式合約範圍）
- 語氣專業、精簡，像真的 SI 提案附件，但不要編造對話裡沒有的數字、金額、日期、法規。
- 不要自己填日期、版本號或產出日期。需要這類欄位時留空、或寫「（待填）」，交給人填。`

app.post("/api/export", async (req, res) => {
  try {
    const { spec, kind } = req.body || {}
    if (!spec) return res.status(400).json({ error: "spec is required" })
    if (kind && kind !== "tender") return res.status(400).json({ error: `unknown kind: ${kind}` })
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on the server" })
    }

    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 6000,
      output_config: { effort: EFFORT },
      system: TENDER_SYSTEM,
      messages: [
        {
          role: "user",
          content: `請依下面的 ProjectSpec 產出提案附件包（草稿）。\n\nProjectSpec（JSON）：\n${JSON.stringify(spec, null, 0)}`,
        },
      ],
    })

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim()
    if (!text) return res.status(502).json({ error: "model returned no text" })
    return res.json({ markdown: text })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[/api/export]", msg)
    return res.status(500).json({ error: msg })
  }
})

app.listen(PORT, () => {
  console.log(`\n[spec-cockpit] server on http://localhost:${PORT}  (model: ${MODEL}, effort: ${EFFORT})\n`)
})
