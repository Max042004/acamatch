import type { ChatMsg, ProjectSpec } from "./types"

export async function iterate(messages: ChatMsg[], spec: ProjectSpec | null): Promise<ProjectSpec> {
  const res = await fetch("/api/iterate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, spec }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data.spec as ProjectSpec
}
