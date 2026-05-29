import React from "react"
import type { PlatformDraft, PlatformKey } from "../../types"

interface PreviewPanelProps {
  results: Partial<Record<PlatformKey, PlatformDraft>>
  error: string | null
}

const PLATFORM_NAMES: Record<PlatformKey, string> = {
  zhihu: "知乎",
  bilibili: "B站",
  xiaohongshu: "小红书"
}

function ResultCard({ platform, draft }: { platform: PlatformKey; draft: PlatformDraft }) {
  return (
    <div className="result-card">
      <h3 className="platform-label">{PLATFORM_NAMES[platform]}</h3>
      <div className="result-title">{draft.title}</div>
      <div className="result-body" style={{ whiteSpace: "pre-wrap" }}>
        {draft.body}
      </div>
      <div className="result-tags">
        {draft.tags.map((t, i) => (
          <span key={i} className="tag">
            #{t}
          </span>
        ))}
      </div>
    </div>
  )
}

export function PreviewPanel({ results, error }: PreviewPanelProps) {
  if (error) {
    return (
      <div className="panel panel-right">
        <div className="preview-placeholder" style={{ color: "#ef4444" }}>
          {error}
        </div>
      </div>
    )
  }

  const entries = Object.entries(results) as [PlatformKey, PlatformDraft][]

  if (entries.length === 0) {
    return (
      <div className="panel panel-right">
        <div className="preview-placeholder">平台预览将显示在这里</div>
      </div>
    )
  }

  return (
    <div className="panel panel-right">
      {entries.map(([key, draft]) => (
        <ResultCard key={key} platform={key} draft={draft} />
      ))}
    </div>
  )
}
