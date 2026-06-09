import type { ChatMsg, ExtractedFile, ProjectSpec } from "./types"

export async function extractFile(file: File): Promise<ExtractedFile> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mime: file.type,
      data: await fileToBase64(file),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data as ExtractedFile
}

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

export async function exportDoc(spec: ProjectSpec, kind: "tender"): Promise<string> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spec, kind }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data.markdown as string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error("failed to read file"))
    reader.onload = () => {
      const result = reader.result
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error("failed to read file as binary"))
        return
      }
      const bytes = new Uint8Array(result)
      let binary = ""
      const chunkSize = 0x8000
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
      }
      resolve(btoa(binary))
    }
    reader.readAsArrayBuffer(file)
  })
}
