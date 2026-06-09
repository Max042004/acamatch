# Acamatch — SI Pre-sales Cockpit

> 先聚焦 SI／接案公司的 pre-sales 場景，把一次標案文件、會議筆記或客戶訪談，轉成需求摘要、追問問題、提案用 PoC、驗收條件草案與提案素材。
> PoC 不是終點，而是需求澄清與提案確認的視覺化媒介。

## 跟 v0 / bolt 不一樣的地方

一般「prompt → 生網站」工具，把你的話當成「已經想清楚的規格」直接生成。
Acamatch 相反：

1. **主動釐清**：把模糊訪談拆成需求，標出 AI 假設、模糊度、估價影響與應追問問題。
2. **規格、PoC、驗收條件是同一份東西的不同視圖**：AI 維護一份 ProjectSpec，左邊渲染成可點擊提案 PoC，右邊渲染成需求拆解、風險、驗收條件、提案素材與 WBS。
3. **確認是「點」出來的，不是「打字」出來的**：客戶看到 PoC 能指出「這塊 OK / 這塊不對」。在 PoC 上點「這樣 OK」→ 對應需求即時升級成「已確認」、沉澱進規格；點「不太對」→ 回灌對話讓 AI 改。

## 架構

```
frontend (React + Vite)  ──/api/iterate──>  server (Express)  ──>  Claude (forced tool use)
   ├─ PocCanvas    可點擊原型（確定性渲染固定元件庫）
   ├─ SpecPanel    需求 + 風險 + 驗收條件 + 提案素材 + WBS
   └─ ChatPanel    來回對話
```

- PoC 不靠即時生成程式碼（live demo 會卡、會壞、規格無法同步），而是 Claude 維護一份 JSON 需求模型（IR），前端用固定元件庫**確定性渲染**。這份 IR 同時是規格、PoC、驗收條件與提案素材，就是 pre-sales 階段的需求閉環。
- 後端用 `@anthropic-ai/sdk`，**強制單一工具呼叫**（`tool_choice`）取得保證合法的 `ProjectSpec`。

## 跑起來

需要 Node 18+ 和一把 Anthropic API key。

```bash
# 1. 裝依賴（根目錄的 server 依賴 + frontend）
npm run setup        # = npm install && npm --prefix frontend install

# 2. 設定金鑰
cp .env.example .env
#   編輯 .env，填入 ANTHROPIC_API_KEY=sk-ant-...

# 3. 同時啟動 server(8787) + 前端(5173)
npm run dev
```

打開 http://localhost:5173 。前端 dev server 會把 `/api` 代理到 `localhost:8787`。

### 環境變數（`.env`）

| 變數 | 預設 | 說明 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | （必填） | Anthropic 金鑰 |
| `ANTHROPIC_MODEL` | `claude-opus-4-8` | demo 想更快可換 `claude-sonnet-4-6` |
| `ANTHROPIC_EFFORT` | `medium` | `low`/`medium`/`high`，越低越快 |
| `PORT` | `8787` | server 連接埠 |

## Demo 腳本

1. 建立專案，場景固定為「準備投標／提案」。
2. 貼上或上傳標案摘要、PDF、會議筆記或訪談逐字稿。
3. 長 PDF 會先建立文件大綱與分段計畫，再依頁面段落順序逐段分析。
4. AI 產出需求摘要、功能/非功能需求、使用者角色、業務流程、模糊點、風險與追問問題。
5. AI 生成提案用 demo PoC，SA 可以在 PoC 上點「這樣 OK」把對應需求升級成已確認。
6. 右側「文件分析」可切換查看每個段落的執行狀態、摘要與紀錄。
7. 需求穩定後匯出提案附件包，包含需求拆解表、風險與假設、驗收條件草案、初步 WBS 與提案簡報素材。

## 技術現實（誠實面）

不宣稱「把標案丟進去就全自動產出系統」。短期 MVP 只驗證 SI／接案公司的 pre-sales 場景：能不能把一次訪談快速轉成可討論、可估價、可展示、可驗收的提案材料。
