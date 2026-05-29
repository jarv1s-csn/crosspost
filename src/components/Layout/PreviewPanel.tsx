import React, { useState } from "react"
import type { PlatformDraft, PlatformKey } from "../../types"

interface PreviewPanelProps {
  results: Partial<Record<PlatformKey, PlatformDraft>>
  error: string | null
  onPublish: (platform: PlatformKey, draft: PlatformDraft) => void
  publishMsg?: string | null
}

const PLATFORM_NAMES: Record<PlatformKey, string> = {
  zhihu: "知乎",
  bilibili: "B站",
  xiaohongshu: "小红书"
}

function formatDraft(draft: PlatformDraft): string {
  return `【标题】\n${draft.title}\n\n【正文】\n${draft.body}\n\n【标签】\n${draft.tags.join(" ")}`
}

function ResultCard({
  platform,
  draft,
  onPublish
}: {
  platform: PlatformKey
  draft: PlatformDraft
  onPublish: (platform: PlatformKey, draft: PlatformDraft) => void
}) {
  const [label, setLabel] = useState("复制")

  function handleCopy() {
    navigator.clipboard.writeText(formatDraft(draft)).then(
      () => {
        setLabel("✓ 已复制")
        setTimeout(() => setLabel("复制"), 2000)
      },
      () => {
        setLabel("复制失败")
        setTimeout(() => setLabel("复制"), 2000)
      }
    )
  }

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
      <button className="copy-btn" onClick={handleCopy}>
        {label}
      </button>
      {platform === "zhihu" && (
        <button className="publish-btn" onClick={() => onPublish(platform, draft)}>
          发布到知乎
        </button>
      )}
    </div>
  )
}

export function PreviewPanel({ results, error, onPublish, publishMsg }: PreviewPanelProps) {
  const [copyAllLabel, setCopyAllLabel] = useState("一键复制全部")

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

  function handleCopyAll() {
    const combined = entries.map(([, draft]) => formatDraft(draft)).join("\n\n══════════\n\n")
    navigator.clipboard.writeText(combined).then(
      () => {
        setCopyAllLabel("✓ 已复制")
        setTimeout(() => setCopyAllLabel("一键复制全部"), 2000)
      },
      () => {
        setCopyAllLabel("复制失败")
        setTimeout(() => setCopyAllLabel("一键复制全部"), 2000)
      }
    )
  }

  return (
    <div className="panel panel-right">
      {publishMsg && (
        <div className="publish-status">{publishMsg}</div>
      )}
      <button className="copy-all-btn" onClick={handleCopyAll}>
        {copyAllLabel}
      </button>
      {entries.map(([key, draft]) => (
        <ResultCard key={key} platform={key} draft={draft} onPublish={onPublish} />
      ))}
    </div>
  )
}
