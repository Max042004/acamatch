import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[app-error-boundary]", error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-lg rounded-lg border border-rose-500/30 bg-card p-4 shadow-xl">
          <div className="text-sm font-semibold text-rose-300">畫面發生錯誤，但工作台仍在執行</div>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
            系統已攔截這次渲染錯誤，避免整個畫面變成空白。請重新整理頁面，或縮小輸入內容後再試。
          </div>
          <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-background p-2 text-xs text-rose-200">
            {this.state.error.message}
          </pre>
          <button
            className="mt-3 rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white"
            onClick={() => window.location.reload()}
          >
            重新整理
          </button>
        </div>
      </div>
    )
  }
}
