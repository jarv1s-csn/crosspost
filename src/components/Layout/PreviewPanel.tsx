import React, { useState } from "react"
import type { PlatformDraft, PlatformKey } from "../../types"

interface PreviewPanelProps {
  results: Partial<Record<PlatformKey, PlatformDraft>>
  error: string | null
  onPublish: (platform: PlatformKey, draft: PlatformDraft) => void
  publishMsg?: string | null
  rawTitle: string
  rawBody: string
  rawTags: string
}

const ALL_PLATFORMS: PlatformKey[] = ["zhihu", "bilibili", "wechat", "xiaohongshu"]

const PLATFORM_NAMES: Record<PlatformKey, string> = {
  zhihu: "知乎",
  bilibili: "B站",
  wechat: "公众号",
  xiaohongshu: "小红书"
}

const PLATFORM_ICONS: Record<PlatformKey, string> = {
  zhihu: "🚀",
  bilibili: "🎬",
  wechat: "📰",
  xiaohongshu: "📕"
}

function buildDraft(
  platform: PlatformKey,
  results: Partial<Record<PlatformKey, PlatformDraft>>,
  rawTitle: string,
  rawBody: string,
  rawTags: string
): PlatformDraft {
  const ai = results[platform]
  if (ai) return ai
  return {
    platformKey: platform,
    title: rawTitle.trim(),
    body: rawBody.trim(),
    tags: rawTags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    metadata: {}
  }
}

function formatDraft(draft: PlatformDraft): string {
  return `【标题】\n${draft.title}\n\n【正文】\n${draft.body}\n\n【标签】\n${draft.tags.join(" ")}`
}

function ResultCard({
  platform,
  draft,
  isAI,
  onPublish
}: {
  platform: PlatformKey
  draft: PlatformDraft
  isAI: boolean
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
      <div className="result-card-header">
        <h3 className="platform-label">
          {PLATFORM_ICONS[platform]} {PLATFORM_NAMES[platform]}
          {isAI && <span className="ai-badge">AI</span>}
        </h3>
        <button className="publish-btn" onClick={() => onPublish(platform, draft)}>
          发布
        </button>
      </div>
      {draft.title && <div className="result-title">{draft.title}</div>}
      {draft.body && (
        <div className="result-body" style={{ whiteSpace: "pre-wrap" }}>
          {draft.body.length > 200 ? draft.body.slice(0, 200) + "..." : draft.body}
        </div>
      )}
      {draft.tags.length > 0 && (
        <div className="result-tags">
          {draft.tags.map((t, i) => (
            <span key={i} className="tag">#{t}</span>
          ))}
        </div>
      )}
      <button className="copy-btn" onClick={handleCopy}>
        {label}
      </button>
    </div>
  )
}

export function PreviewPanel({
  results,
  error,
  onPublish,
  publishMsg,
  rawTitle,
  rawBody,
  rawTags
}: PreviewPanelProps) {
  if (error) {
    return (
      <div className="panel panel-right">
        <div className="preview-placeholder" style={{ color: "#ef4444" }}>
          {error}
        </div>
      </div>
    )
  }

  const drafts = ALL_PLATFORMS.map(p => ({
    platform: p,
    draft: buildDraft(p, results, rawTitle, rawBody, rawTags),
    isAI: !!results[p]
  }))

  const hasContent = rawTitle.trim() || rawBody.trim()

  return (
    <div className="panel panel-right">
      {publishMsg && (
        <div className="publish-status">{publishMsg}</div>
      )}
      {!hasContent ? (
        <div className="preview-placeholder">
          输入内容后各平台预览将显示在这里
        </div>
      ) : (
        drafts.map(({ platform, draft, isAI }) => (
          <ResultCard
            key={platform}
            platform={platform}
            draft={draft}
            isAI={isAI}
            onPublish={onPublish}
          />
        ))
      )}
    </div>
  )
}
