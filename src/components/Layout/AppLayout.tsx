import React, { useState, useCallback } from "react"
import { TopBar } from "./TopBar"
import { InputPanel } from "./InputPanel"
import { PreviewPanel } from "./PreviewPanel"
import { transformAllPlatforms } from "../../ai"
import type { PlatformDraft, PlatformKey } from "../../types"

export function AppLayout() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Partial<Record<PlatformKey, PlatformDraft>>>({})
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState("")

  const handleAiRewrite = useCallback(
    async (input: { title: string; body: string; tags: string[] }) => {
      if (!apiKey.trim()) {
        setError("请先输入 DeepSeek API Key")
        return
      }

      setLoading(true)
      setError(null)
      setResults({})

      try {
        const data = await transformAllPlatforms(
          { ...input, images: [] },
          apiKey.trim()
        )
        if (Object.keys(data).length === 0) {
          setError("所有平台改写失败，请检查 API Key 和网络连接")
        } else {
          setResults(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "改写失败")
      } finally {
        setLoading(false)
      }
    },
    [apiKey]
  )

  return (
    <div className="app-shell">
      <TopBar>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="DeepSeek API Key"
            style={{
              width: 180,
              padding: "2px 6px",
              fontSize: 11,
              border: "1px solid #6366f1",
              borderRadius: 4
            }}
          />
        </div>
      </TopBar>
      <div className="panels">
        <InputPanel onAiRewrite={handleAiRewrite} loading={loading} />
        <PreviewPanel results={results} error={error} />
      </div>
    </div>
  )
}
