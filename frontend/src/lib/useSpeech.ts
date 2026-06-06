import { useEffect, useRef, useState } from "react"

// Minimal typing for the Web Speech API (not in the default DOM lib).
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
}

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

// Browser-native speech-to-text. Zero backend, real-time interim results.
// Chrome/Edge: full support. Firefox: unsupported. Safari: partial.
// Requires a secure context (HTTPS) — localhost counts, so local dev is fine.
export function useSpeech(lang = "zh-TW") {
  const Ctor = getCtor()
  const supported = !!Ctor

  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef("") // committed text; interim is appended live

  useEffect(() => {
    return () => recRef.current?.abort()
  }, [])

  function start() {
    if (!Ctor || listening) return
    setError(null)
    finalRef.current = ""
    setTranscript("")

    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true // keep listening through pauses
    rec.interimResults = true // stream partial words as they're recognized

    rec.onresult = (e: any) => {
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript
        if (e.results[i].isFinal) finalRef.current += chunk
        else interim += chunk
      }
      setTranscript(finalRef.current + interim)
    }
    rec.onerror = (e: any) => {
      setError(
        e?.error === "not-allowed" || e?.error === "service-not-allowed"
          ? "麥克風權限被拒，請在瀏覽器允許存取。"
          : `語音辨識錯誤：${e?.error || "unknown"}`,
      )
      setListening(false)
    }
    rec.onend = () => setListening(false)

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function stop() {
    recRef.current?.stop()
    setListening(false)
  }

  return { supported, listening, transcript, error, start, stop }
}
