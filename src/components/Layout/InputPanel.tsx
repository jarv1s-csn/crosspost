import React from "react"

interface InputPanelProps {
  title: string
  body: string
  tags: string
  onTitleChange: (v: string) => void
  onBodyChange: (v: string) => void
  onTagsChange: (v: string) => void
  onAiRewrite: (data: { title: string; body: string; tags: string[] }) => void
  onDirectPublish: () => void
  onDirectPublishBilibili: () => void
  onDirectPublishWechat: () => void
  loading: boolean
}

export function InputPanel({
  title,
  body,
  tags,
  onTitleChange,
  onBodyChange,
  onTagsChange,
  onAiRewrite,
  onDirectPublish,
  onDirectPublishBilibili,
  onDirectPublishWechat,
  loading
}: InputPanelProps) {
  const handleRewrite = () => {
    if (!body.trim()) return
    onAiRewrite({
      title: title.trim(),
      body: body.trim(),
      tags: tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
    })
  }

  return (
    <div className="panel panel-left">
      <div className="input-group">
        <label>标题</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="输入标题（可选）"
          className="title-input"
        />
      </div>
      <div className="input-group">
        <label>正文（Markdown）</label>
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="输入你的内容..."
          className="content-textarea"
          rows={12}
        />
      </div>
      <div className="input-group">
        <label>标签（逗号分隔）</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="AI, 编程, 效率工具"
          className="title-input"
        />
      </div>
      <div className="button-row">
        <button
          onClick={handleRewrite}
          disabled={loading || !body.trim()}
          className="ai-button"
        >
          {loading ? "改写中..." : "✨ AI 改写"}
        </button>
        <button
          onClick={onDirectPublish}
          disabled={!body.trim()}
          className="publish-direct-btn"
        >
          🚀 直接发布到知乎
        </button>
        <button
          onClick={onDirectPublishBilibili}
          disabled={!body.trim()}
          className="publish-direct-btn"
        >
          🎬 直接发布到B站
        </button>
        <button
          onClick={onDirectPublishWechat}
          disabled={!body.trim()}
          className="publish-direct-btn"
        >
          📰 直接发布到公众号
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
        💡 公众号/B站 需先在浏览器中登录。内容 2 秒无操作自动保存。
      </div>
    </div>
  )
}
