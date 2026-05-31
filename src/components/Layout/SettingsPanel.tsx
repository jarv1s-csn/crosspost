import React, { useState, useEffect } from "react"
import {
  saveApiKey, loadApiKey,
  saveProvider, loadProvider,
  saveCustomEndpoint, loadCustomEndpoint,
  saveCustomModel, loadCustomModel,
} from "../../storage"

export function SettingsPanel() {
  const [key, setKey] = useState("")
  const [provider, setProvider] = useState("deepseek")
  const [customEndpoint, setCustomEndpoint] = useState("")
  const [customModel, setCustomModel] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      loadApiKey(),
      loadProvider(),
      loadCustomEndpoint(),
      loadCustomModel(),
    ])
      .then(([k, p, ep, m]) => {
        if (k) setKey(k)
        if (p) setProvider(p)
        if (ep) setCustomEndpoint(ep)
        if (m) setCustomModel(m)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  function handleSave() {
    Promise.all([
      saveApiKey(key),
      saveProvider(provider),
      saveCustomEndpoint(customEndpoint),
      saveCustomModel(customModel),
    ])
      .then(() => {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })
      .catch(() => {})
  }

  if (!loaded) return null

  return (
    <div className="settings-page">
      <h3 className="settings-title">🤖 AI 模型</h3>

      <div className="settings-card">
        <label className="settings-label">提供商</label>
        <select
          className="settings-select"
          value={provider}
          onChange={(e) => { setProvider(e.target.value); setSaved(false) }}
        >
          <option value="deepseek">DeepSeek</option>
          <option value="openai">OpenAI</option>
          <option value="custom">自定义端点</option>
        </select>

        {provider === "custom" && (
          <>
            <label className="settings-label">自定义端点 URL</label>
            <input
              type="text"
              className="settings-input"
              value={customEndpoint}
              onChange={(e) => { setCustomEndpoint(e.target.value); setSaved(false) }}
              placeholder="https://api.example.com/v1/chat/completions"
            />
          </>
        )}

        {(provider === "custom" || provider === "openai") && (
          <>
            <label className="settings-label">模型名称</label>
            <input
              type="text"
              className="settings-input"
              value={customModel}
              onChange={(e) => { setCustomModel(e.target.value); setSaved(false) }}
              placeholder={provider === "openai" ? "gpt-4o-mini" : "your-model-name"}
            />
          </>
        )}

        {provider === "deepseek" && (
          <>
            <label className="settings-label">模型</label>
            <select className="settings-select" disabled>
              <option value="deepseek-chat">deepseek-chat</option>
            </select>
          </>
        )}

        <label className="settings-label">API Key</label>
        <div className="settings-key-row">
          <input
            type="password"
            className="settings-input"
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false) }}
            placeholder="sk-..."
          />
          <button className="settings-save-btn" onClick={handleSave}>
            {saved ? "✅ 已保存" : "保存"}
          </button>
        </div>
        <p className="settings-hint">
          密钥存储在浏览器本地，仅用于调用 AI API。
        </p>
      </div>

      <h3 className="settings-title" style={{ marginTop: 20 }}>📋 平台连接状态</h3>
      <div className="settings-card">
        {[
          { key: "zhihu", name: "知乎", icon: "🚀", note: "无需登录" },
          { key: "bilibili", name: "B站", icon: "🎬", note: "需在浏览器中登录" },
          { key: "wechat", name: "公众号", icon: "📰", note: "需微信扫码登录" },
          { key: "xiaohongshu", name: "小红书", icon: "📕", note: "需在浏览器中登录" },
        ].map((p) => (
          <div key={p.key} className="platform-status-row">
            <span className="platform-status-icon">{p.icon}</span>
            <span className="platform-status-name">{p.name}</span>
            <span className="platform-status-note">{p.note}</span>
            <span className="platform-status-badge">✅ 已配置</span>
          </div>
        ))}
      </div>
    </div>
  )
}
