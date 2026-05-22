import { Link, NavLink, Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/70 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-sky-400 to-emerald-400" />
            <span className="font-bold text-lg">AcaMatch <span className="text-sky-400">AI</span></span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/" end>首頁</NavItem>
            <NavItem to="/analyze">技術分析</NavItem>
            <NavItem to="/reports">歷史報告</NavItem>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/60">
        <div className="container mx-auto px-6 py-6 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 AcaMatch AI — The Research Discovery Layer for the AI Economy</span>
          <span className="text-xs">MVP build · 劉孟劭 × 黃聖翔 × 莊永太 × 何學禮</span>
        </div>
      </footer>
    </div>
  )
}

function NavItem({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "px-3 py-2 text-sm rounded-md transition-colors",
          isActive ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        )
      }
    >
      {children}
    </NavLink>
  )
}
