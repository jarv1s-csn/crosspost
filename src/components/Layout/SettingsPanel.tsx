import React, { useState, useEffect } from "react"
import { saveApiKey, loadApiKey } from "../../storage"

export function SettingsPanel() {
  const [key, setKey] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadApiKey()
      .then((k) => { if (k) setKey(k) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  function handleSave() {
    saveApiKey(key)
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
        <select className="settings-select" value="deepseek" disabled>
          <option value="deepseek">DeepSeek</option>
          <option value="openai" disabled>OpenAI（即将支持）</option>
          <option value="custom" disabled>自定义端点（即将支持）</option>
        </select>

        <label className="settings-label">模型</label>
        <select className="settings-select" disabled>
          <option value="deepseek-chat">deepseek-chat</option>
        </select>

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
          密钥存储在浏览器本地，仅用于调用 DeepSeek API。
        </p>
      </div>
    </div>
  )
}
