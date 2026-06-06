# Spec Cockpit — 邊講邊出 PoC

> 在對話現場，把一句模糊的需求同時長成「規格」與「可點擊的 PoC」。
> 鎖定招標 / 接案場景：開標方常常講不清楚自己要什麼，需求是邊談邊長出來的。

## 跟 v0 / bolt 不一樣的地方

一般「prompt → 生網站」工具，把你的話當成「已經想清楚的規格」直接生成。
Spec Cockpit 相反：

1. **主動釐清**：把模糊的話拆成需求，明確標出「哪些是 AI 替你假設的」、反問「哪裡還沒講清楚」（招標流程裡的「釋疑」）。
2. **規格與 PoC 是同一份東西的兩面**：AI 維護「一份」結構化需求模型（ProjectSpec）。左邊渲染成可點擊原型、右邊渲染成規格書，永遠同步。
3. **確認是「點」出來的，不是「打字」出來的**：人沒辦法把需求寫清楚，但看到畫面能指出「這塊 OK / 這塊不對」。在 PoC 上點「這樣 OK」→ 對應需求即時升級成「已確認」、沉澱進規格（純前端、不等 LLM）；點「不太對」→ 回灌對話讓 AI 改。

## 架構

```
frontend (React + Vite)  ──/api/iterate──>  server (Express)  ──>  Claude (forced tool use)
   ├─ PocCanvas    可點擊原型（確定性渲染固定元件庫）
   ├─ SpecPanel    需求 + AI 釐清問題
   └─ ChatPanel    來回對話
```

- PoC 不靠即時生成程式碼（live demo 會卡、會壞、規格無法同步），而是 Claude 維護一份 JSON 需求模型（IR），前端用固定元件庫**確定性渲染**。這份 IR 同時是規格、也是 PoC——就是我們的差異化核心，也是中間那層 system analysis。
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

1. 丟一句很模糊的話：例如「我們想要一個讓市民可以線上預約活動中心場地的系統」。
2. AI 回：拆出幾條需求（標「AI 假設」）、長出第一版 PoC、並丟 1-2 個釐清問題（要付款嗎？要審核嗎？）。
3. 在右邊用點的回答釐清問題，或在 PoC 上點某塊「這樣 OK」→ 看那條需求即時變「已確認」。
4. 改主意：點某塊「不太對」→ 對話框帶出草稿 → 送出 → 規格與 PoC 同步更新。
5. 收尾：規格穩定後「匯出規格」（之後可一鍵轉成真程式碼 / 標書草稿）。

## 技術現實（誠實面）

不宣稱「把標案丟進去就全自動產出系統」。定位是：讓 system analysis 的人少跟客戶來回——AI 讓人做更多事，不是取代人。
