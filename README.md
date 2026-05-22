# AcaMatch AI — MVP

> The Research Discovery Layer for the AI Economy
> 用商業語言提問,AI 自動產出技術轉型藍圖。

MVP stack:
- **Frontend**: React 18 + Vite + TypeScript + Tailwind + shadcn-style UI
- **Backend**: Supabase (Postgres + Edge Functions)
- **AI**: OpenAI Chat Completions (gpt-4o-mini by default)

The OpenAI key never reaches the browser — the frontend calls a Supabase Edge Function which proxies OpenAI and writes the result to Postgres.

```
React  ─►  Supabase Edge Function /analyze  ─►  OpenAI API
                       │
                       └─►  reports (Postgres)
                                  ▲
React  ─────────────────  read history  ───┘
```

---

## Project layout

```
acamatch/
├── frontend/                       # Vite React app
│   ├── src/
│   │   ├── pages/                  # Landing / Analyze / Reports
│   │   ├── components/ui/          # Button, Card, Input, Textarea, Label, Badge, Select
│   │   ├── components/Layout.tsx
│   │   └── lib/                    # supabase client, session helpers, types
│   └── .env.example
└── supabase/
    ├── migrations/20260522000000_init.sql   # reports table + RLS
    ├── functions/analyze/index.ts            # OpenAI proxy + DB insert
    └── config.toml
```

---

## Setup

### 1. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

### 2. Supabase

Install the Supabase CLI if you don't have it: <https://supabase.com/docs/guides/cli>.

```bash
# from project root
supabase login
supabase link --project-ref <your-project-ref>

# apply schema
supabase db push

# set the OpenAI secret (server-side only)
supabase secrets set OPENAI_API_KEY=sk-...
# optional:
supabase secrets set OPENAI_MODEL=gpt-4o-mini

# deploy the edge function
supabase functions deploy analyze
```

The Edge Function is configured with `verify_jwt = false` so the anonymous frontend can call it. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

### 3. Local Supabase (optional)

```bash
supabase start              # local Postgres + Functions runtime
supabase db reset           # apply migrations
supabase functions serve analyze --env-file ./supabase/.env.local
```

`./supabase/.env.local` should contain at minimum `OPENAI_API_KEY=...`. Point the frontend at the local Supabase URLs printed by `supabase start`.

---

## 協作說明(給同學)

我們共用一個 Supabase 專案 + 一個 GitHub repo。OpenAI key 只放在 Supabase secrets,本機任何地方都不應該有。

### Onboarding(第一次加入時)

```bash
git clone <repo-url>
cd acamatch/frontend
npm install
cp .env.example .env
# 跟 owner 拿 VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY,填進 .env
npm run dev
```

要本地改 Edge Function 或 migration 才需要這步:

```bash
npm install -g supabase                           # 或 brew install supabase/tap/supabase
supabase login                                    # 用自己的 Supabase 帳號
supabase link --project-ref <共用的 project ref>  # 跟 owner 拿
```

Owner 需要先到 Supabase Dashboard → Project Settings → Team → Invite member,把同學加進專案。

### 機密管理

| 資料 | 放哪 | 能不能傳到群組 |
|---|---|---|
| `VITE_SUPABASE_URL` | 本機 `.env`(gitignored) | ✅ 可以,不算機密 |
| `VITE_SUPABASE_ANON_KEY` | 本機 `.env` | ✅ 受 RLS 保護,前端本來就會曝光 |
| `OPENAI_API_KEY` | **只在 Supabase secrets**(`supabase secrets set`) | ❌ 永遠不要傳、不要寫進任何 `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | 只在 Supabase 內部自動注入 Edge Function | ❌ 絕對不可外流 |

`.env` 已在 `.gitignore`,但每個人都要自己檢查 `git status` 沒把 `.env` 不小心 add 進來。

### 分支 / PR 流程

- `main` 永遠保持可跑(能 `npm run dev` + `npm run build`)
- 一個 feature 一個分支:`feat/landing-tweak`、`fix/analyze-error`、`chore/deps-bump`
- 推上去開 PR,**至少 1 人 review** 後再 merge
- 合併前自己先跑過:
  ```bash
  cd frontend && npm run build   # 同時跑 tsc 與 vite build
  ```

### 改動需要協調的地方

| 改到這些檔案 | 流程 |
|---|---|
| `supabase/migrations/*.sql` | 新增一個新檔(別改舊的)。PR 描述標註「需要 db push」。Merge 後由 owner 跑 `supabase db push` |
| `supabase/functions/analyze/index.ts` | PR 描述標註「需要 functions deploy」。Merge 後 owner 跑 `supabase functions deploy analyze` |
| `frontend/.env.example` | 改了的話,通知所有同學更新自己的 `.env` |
| `package.json` 加裝套件 | 一定要 commit 同步的 `package-lock.json`,同學 `git pull` 後重跑 `npm install` |

### 常見坑

- **改了 prompt 但沒 deploy**:Edge Function 是部署到 Supabase 雲端的,本機改完一定要 `supabase functions deploy analyze` 才會生效。
- **同學看不到自己的 reports**:`session_id` 存在 localStorage,清快取 / 換瀏覽器 / 換電腦就會看不到舊報告 — 這是預期行為(MVP 沒做 auth)。
- **沒裝 Supabase CLI 也能開發**:只改 `frontend/` 的人不用裝。只有要動 migration / edge function 的人才需要。

---

## Data model

`reports` (one row per analysis):

| column            | type        | notes                                       |
|-------------------|-------------|---------------------------------------------|
| id                | uuid PK     | `gen_random_uuid()`                         |
| session_id        | text        | client-generated UUID stored in localStorage |
| business_problem  | text        | raw user input                              |
| industry          | text        |                                             |
| key_metrics       | text        |                                             |
| budget_range      | text        |                                             |
| result            | jsonb       | structured AI output (see `AnalysisResult`) |
| created_at        | timestamptz |                                             |

RLS:
- `anon` may `select` all rows (the frontend filters by `session_id`).
- Inserts are only performed by the Edge Function using the service-role key.

> ⚠️ For MVP simplicity, `anon` can read any row — session IDs are not secret. Add auth (Supabase Auth) and tighten the RLS policy before any sensitive launch.

---

## AI output shape

The system prompt forces the model to return JSON:

```ts
interface AnalysisResult {
  tech_direction: string
  tech_keywords: string[]
  recommended_professors: { name: string; school: string; expertise: string }[]
  trl_score: "HIGH" | "MEDIUM" | "LOW"
  trl_explanation: string
  roi_estimate: string
  implementation_advice: string
  related_paper_count: number
}
```

To improve grounding, replace the prompt in `supabase/functions/analyze/index.ts` with a RAG step that retrieves real papers / professors before generation.

---

## Next steps (post-MVP)

- Supabase Auth (email / Google) so reports are tied to real users.
- Real semantic search backed by a paper corpus + pgvector.
- Streaming responses for the Dashboard.
- Replace mocked professor list with a verified directory.
- Rate limiting on the Edge Function.
