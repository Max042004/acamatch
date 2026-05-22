// Supabase Edge Function: /analyze
// Proxies OpenAI Chat Completions and persists the result to `reports`.
// Env vars (set via `supabase secrets set`):
//   OPENAI_API_KEY            — required
//   OPENAI_MODEL              — optional, defaults to gpt-4o-mini
//   SUPABASE_URL              — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected
//
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const SYSTEM_PROMPT = `你是 AcaMatch AI 的虛擬 AI 架構師(Virtual AI Architect)。
你的任務是根據企業的商業問題,輸出可落地的「技術轉型藍圖」。

請只輸出 JSON,符合以下 schema(所有欄位必填):
{
  "tech_direction": string,                 // 推薦技術方向(1-2 句話,具體可執行)
  "tech_keywords": string[],                // 3-5 個關鍵技術詞彙,英文或中英混合皆可
  "recommended_professors": [               // 2-4 位
    { "name": string, "school": string, "expertise": string }
  ],
  "trl_score": "HIGH" | "MEDIUM" | "LOW",
  "trl_explanation": string,                // 技術成熟度說明(1-2 句)
  "roi_estimate": string,                   // 例如「中高 (12-18mo)」或「高 (6-12mo)」
  "implementation_advice": string,          // AI 導入建議(3-5 句,分點換行)
  "related_paper_count": number             // 估計相關論文數量
}

注意事項:
- 教授名稱與學校在 MVP 階段可以是合理的假設(以台灣大學、清大、成大、台科大、交大等台灣學界為主)
- 全程使用繁體中文
- 不要輸出 JSON 以外的任何文字`

interface AnalyzeBody {
  session_id?: string
  business_problem?: string
  industry?: string
  key_metrics?: string
  budget_range?: string
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as AnalyzeBody
    const { session_id, business_problem, industry, key_metrics, budget_range } = body

    if (!business_problem || !business_problem.trim()) {
      return json({ error: "business_problem is required" }, 400)
    }
    if (!session_id) {
      return json({ error: "session_id is required" }, 400)
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) return json({ error: "OPENAI_API_KEY not configured" }, 500)
    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini"

    const userPrompt = [
      `商業問題: ${business_problem}`,
      `產業類型: ${industry || "未指定"}`,
      `關鍵指標: ${key_metrics || "未指定"}`,
      `預算範圍: ${budget_range || "未指定"}`,
    ].join("\n")

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      return json({ error: `OpenAI API error (${openaiRes.status}): ${errText}` }, 502)
    }

    const openaiData = await openaiRes.json()
    const content = openaiData?.choices?.[0]?.message?.content
    if (!content) return json({ error: "Empty response from OpenAI" }, 502)

    let result: Record<string, unknown>
    try {
      result = JSON.parse(content)
    } catch {
      return json({ error: "Failed to parse OpenAI JSON output" }, 502)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from("reports")
      .insert({
        session_id,
        business_problem,
        industry: industry ?? null,
        key_metrics: key_metrics ?? null,
        budget_range: budget_range ?? null,
        result,
      })
      .select()
      .single()

    if (error) return json({ error: `DB insert failed: ${error.message}` }, 500)

    return json({ report: data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json({ error: msg }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
