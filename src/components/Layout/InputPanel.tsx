import React, { useState } from "react"

interface InputPanelProps {
  onAiRewrite: (data: { title: string; body: string; tags: string[] }) => void
  loading: boolean
}

export function InputPanel({ onAiRewrite, loading }: InputPanelProps) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tags, setTags] = useState("")

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
          onChange={(e) => setTitle(e.target.value)}
          placeholder="输入标题（可选）"
          className="title-input"
        />
      </div>
      <div className="input-group">
        <label>正文（Markdown）</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
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
          onChange={(e) => setTags(e.target.value)}
          placeholder="AI, 编程, 效率工具"
          className="title-input"
        />
      </div>
      <button
        onClick={handleRewrite}
        disabled={loading || !body.trim()}
        className="ai-button"
      >
        {loading ? "改写中..." : "✨ AI 改写"}
      </button>
    </div>
  )
}
