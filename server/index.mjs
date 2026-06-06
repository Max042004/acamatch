// Spec Cockpit — local proxy to Claude.
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

const PORT = process.env.PORT || 8787
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8"
const EFFORT = process.env.ANTHROPIC_EFFORT || "medium"

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
    requirements: {
      type: "array",
      description: "目前釐清出來的需求清單。已 confirmed 的項目務必原樣保留、不可降級或刪除。",
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
                  description: "這個元件實現的需求 id（對應 requirements[].id）。盡量都填，讓畫面和規格綁在一起。",
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
  required: ["title", "one_liner", "assistant_message", "requirements", "open_questions", "screens"],
}

const SYSTEM_PROMPT = `你是「Spec Cockpit」的需求釐清引擎。使用情境：政府／企業招標案。開標方常常「講不清楚自己要什麼」，需求是邊談邊長出來的。

你跟一般的「prompt → 直接生網站」工具最大的不同：
- 你不假裝使用者已經想清楚。你會主動把模糊的話拆成需求，明確標出「哪些是你替他假設的」，並反問「哪裡還沒講清楚」。
- 你維護「一份」結構化需求模型（ProjectSpec）。這份模型同時被呈現成兩個視圖：人看的【規格】(requirements + open_questions) 與可點擊的【PoC】(screens)。規格與 PoC 是同一份東西的兩面，必須一致。

每一回合，使用者會給你一句（通常很模糊的）話，以及目前的 ProjectSpec 狀態。你要回傳「完整更新後」的 ProjectSpec（呼叫 render_spec 工具）。規則：

1. 把使用者的話拆成具體、可驗收的 requirements。使用者剛講、你合理補的 → status="assumed"，source 寫「AI 假設」。使用者明講的 → 視情況 "confirmed" 或 "open"。
2. 【非常重要】status="confirmed" 的需求是使用者在 PoC 上親手確認過的。務必「原樣保留」這些項目（同 id、同 statement、維持 confirmed），絕對不要降級成 assumed 或刪掉。其他項目可以自由增修。
3. 主動丟 open_questions：招標案最容易卡在這些沒講清楚的點（要不要線上付款？要不要審核？一個人能訂幾個時段？要不要登入？資料要保留多久？）。每題給 why 和 options，讓使用者用點的就能回答。
4. 根據需求長出 / 更新 screens。可用的元件（type → props）：
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
5. 每個元件盡量設 reqRef，連到它實現的那條需求 id。這樣使用者在畫面上點「OK」時，系統就能把對應需求沉澱進規格。
6. id 要穩定：跨回合沿用既有的 requirement / component / screen id，只在新增時給新 id。不要每回合重編號。
7. assistant_message 用繁體中文、口語、精簡。先講你這回合做了什麼，再點出你做的關鍵假設，最後丟最重要的 1-2 個釐清問題。
8. 全程繁體中文。一開始畫面可以粗略，重點是「先有個能指的東西」，之後靠來回對話收斂。`

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

const app = express()
app.use(cors())
app.use(express.json({ limit: "2mb" }))

app.get("/api/health", (_req, res) => res.json({ ok: true, model: MODEL }))

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

const TENDER_SYSTEM = `你是協助撰寫政府採購／企業招標「需求規格書（草稿）」的助理。根據給你的 ProjectSpec，產出一份結構化、可直接拿去討論的 Markdown 文件。

要求：
- 全程繁體中文，輸出「純 Markdown」，不要用程式碼區塊把整份文件包起來。
- 結構（用 ## 標題）：
  1. 專案概述（用 one_liner 與整體脈絡）
  2. 需求規格（把 requirements 條列；每條標明狀態：✅已確認 / 🟡待確認(AI 假設) / 🔵待釐清。忠實反映，不要把假設講成定案）
  3. 功能範圍（依 screens 描述各畫面要做的事）
  4. 待釐清事項 / 釋疑清單（把 open_questions 整理成表格：問題 | 為什麼重要 | 建議選項）
  5. 驗收標準（從已確認的需求衍生成可驗收的條目）
  6. 備註（誠實標註：標🟡的項目是 AI 依現有對話所做的合理假設，尚待開標方確認；本文件為草稿）
- 語氣專業、精簡，像真的招標文件，但不要編造對話裡沒有的數字、金額、法規。`

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
          content: `請依下面的 ProjectSpec 產出需求規格書（草稿）。\n\nProjectSpec（JSON）：\n${JSON.stringify(spec, null, 0)}`,
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
