import { Link } from "react-router-dom"
import { ArrowRight, Sparkles, Database, Search, BrainCircuit, LineChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Landing() {
  return (
    <div>
      <Hero />
      <Problem />
      <Solution />
      <WhyNow />
      <Vision />
    </div>
  )
}

function Hero() {
  return (
    <section className="hero-grid">
      <div className="container mx-auto px-6 py-24 lg:py-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          The Research Discovery Layer for the AI Economy
        </div>
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
          AcaMatch <span className="gradient-text">AI</span>
        </h1>
        <p className="text-lg lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-4">
          企業不缺 AI。
        </p>
        <p className="text-xl lg:text-3xl font-medium max-w-3xl mx-auto mb-12">
          企業缺的是：<span className="gradient-text">持續找到正確技術方向的能力</span>
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/analyze">
              立即試用 <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/reports">查看歷史報告</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <Section label="Problem" title="台灣大量企業正在 AI 化,但根本不知道該找誰">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sky-400">市場現況</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <Bullet>2024–2026 台灣企業大量導入智慧製造、AOI、工業 AI</Bullet>
              <Bullet>大部分企業面臨多維度 × 長週期轉型</Bullet>
              <Bullet>沒有 AI 團隊,看不懂研究技術</Bullet>
              <Bullet>不知道技術是否成熟可落地</Bullet>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sky-400">現實世界流程</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Flow steps={["企業需求", "Google Search", "論文"]} variant="blue" />
              <Flow steps={["看不懂", "找不到適合團隊", "放棄 AI 導入 ✗"]} variant="red" />
            </div>
            <p className="mt-6 text-sm text-rose-400 font-semibold">
              研究資源存在,但無法被企業有效搜尋 — HIGH FRICTION
            </p>
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}

function Solution() {
  const steps = [
    { title: "企業輸入", body: "「想降低設備故障率」" },
    { title: "Data Masking Agent", body: "機密自動脫敏保護" },
    { title: "AI Semantic Understanding", body: "語意理解 · 技術分析" },
    { title: "Technology Analysis", body: "TRL 評估 · ROI 區間" },
    { title: "輸出報告", body: "教授推薦 · AI 導入建議" },
  ]
  return (
    <Section label="Solution" title="用商業語言提問,AI 自動產出「技術轉型藍圖」">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {steps.map((s, i) => (
          <Card key={i} className="bg-card/70">
            <CardHeader className="pb-3">
              <div className="text-xs text-sky-400 font-semibold">{s.title}</div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{s.body}</CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Feature icon={<BrainCircuit className="w-5 h-5" />} title="技術方向" />
        <Feature icon={<Search className="w-5 h-5" />} title="推薦教授" />
        <Feature icon={<LineChart className="w-5 h-5" />} title="預估 TRL & ROI" />
        <Feature icon={<Sparkles className="w-5 h-5" />} title="AI 導入建議" />
      </div>
      <p className="mt-8 text-center text-sm lg:text-base text-muted-foreground italic">
        我們的 AI 擔任企業的 <span className="text-sky-300">Virtual AI Architect (虛擬架構師)</span> —
        提供持續性藍圖,而不是一次性的論文搜尋服務。
      </p>
    </Section>
  )
}

function WhyNow() {
  return (
    <Section label="Why Now" title="AI 第一次讓「研究搜尋」變得可規模化">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-rose-500/20">
          <CardHeader>
            <CardTitle className="text-rose-400">過去 — 做不到</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <Bullet>Semantic Search 技術不成熟</Bullet>
              <Bullet>企業不敢上傳機密參數</Bullet>
              <Bullet>建立推薦系統成本極高</Bullet>
              <Bullet>企業問題 ↔ 研究無法對應</Bullet>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle className="text-emerald-400">現在 — 突然可行</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-muted-foreground">
              <Bullet>LLM + RAG + Agent Workflow 普及</Bullet>
              <Bullet>地端脫敏模型成熟,解決隱私焦慮</Bullet>
              <Bullet>AI 真正能理解企業問題 ↔ 技術</Bullet>
              <Bullet>建構成本降低 10x,速度加快</Bullet>
            </ul>
          </CardContent>
        </Card>
      </div>
      <p className="mt-8 text-center">
        <span className="text-muted-foreground italic">Google 解決了網頁搜尋。</span>
        <br />
        <span className="text-lg lg:text-xl font-semibold gradient-text">
          AcaMatch AI 解決 AI 時代的技術搜尋。
        </span>
      </p>
    </Section>
  )
}

function Vision() {
  return (
    <Section label="Vision" title="" className="pb-32">
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sky-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Vision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm">
            <p>真正稀缺的是:「快速找到正確技術方向的能力」</p>
            <p>AcaMatch AI 希望成為企業 AI 轉型的第一個入口。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sky-400 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5" /> Why Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <Bullet><strong className="text-foreground">21 歲 AI Native 團隊</strong> — 可高速迭代 MVP</Bullet>
              <Bullet><strong className="text-foreground">AI Agent Workflow</strong> — 核心技術能力</Bullet>
              <Bullet><strong className="text-foreground">Semantic Search</strong> — 語意引擎專長</Bullet>
              <Bullet><strong className="text-foreground">Data Privacy First</strong> — 脫敏架構設計</Bullet>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-emerald-400 flex items-center gap-2">
              <Database className="w-5 h-5" /> Ask
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-foreground/70 mb-1">目標</div>
              完成 MVP · 取得第一批 Pilot 客戶
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-foreground/70 mb-1">尋求</div>
              種子資金 · 製造業 Pilot Partner
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-foreground/70 mb-1">Co-founder</div>
              B2B Enterprise Sales · 最後一哩路
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}

function Section({
  label,
  title,
  children,
  className,
}: {
  label: string
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`container mx-auto px-6 py-16 lg:py-24 ${className ?? ""}`}>
      {label && <div className="text-sm text-sky-400 font-semibold mb-2">{label}</div>}
      {title && <h2 className="text-2xl lg:text-4xl font-bold mb-10 max-w-3xl">{title}</h2>}
      {children}
    </section>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-sky-500 mt-1">▸</span>
      <span>{children}</span>
    </li>
  )
}

function Flow({ steps, variant }: { steps: string[]; variant: "blue" | "red" }) {
  const color =
    variant === "blue"
      ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
      : "bg-rose-500/15 text-rose-300 border-rose-500/30"
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded border text-xs ${color}`}>{s}</span>
          {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
        </span>
      ))}
    </div>
  )
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-card/40">
      <div className="text-sky-400">{icon}</div>
      <div className="text-sm font-medium">{title}</div>
    </div>
  )
}
