import React, { useState, useCallback, useEffect, useRef } from "react"
import { TopBar } from "./TopBar"
import { InputPanel } from "./InputPanel"
import { PreviewPanel } from "./PreviewPanel"
import { transformAllPlatforms } from "../../ai"
import type { PlatformDraft, PlatformKey } from "../../types"
import { saveApiKey, loadApiKey, saveDraft, loadDraft } from "../../storage"
import { platformRegistry } from "../../platforms"

export function AppLayout() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Partial<Record<PlatformKey, PlatformDraft>>>({})
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [publishMsg, setPublishMsg] = useState<string | null>(null)

  // Editor state
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tags, setTags] = useState("")
  const [draftLoaded, setDraftLoaded] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved data on mount (with defensive chrome.storage check)
  useEffect(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        loadApiKey().then((key) => {
          if (key) setApiKey(key)
          setApiKeyLoaded(true)
        }).catch(() => setApiKeyLoaded(true))

        loadDraft().then((draft) => {
          if (draft) {
            setTitle(draft.title)
            setBody(draft.body)
            setTags(draft.tags)
          }
          setDraftLoaded(true)
        }).catch(() => setDraftLoaded(true))
      } else {
        setApiKeyLoaded(true)
        setDraftLoaded(true)
      }
    } catch {
      setApiKeyLoaded(true)
      setDraftLoaded(true)
    }
  }, [])

  // Persist API key on change
  useEffect(() => {
    if (apiKeyLoaded && apiKey) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          saveApiKey(apiKey)
        }
      } catch { /* ignore */ }
    }
  }, [apiKey, apiKeyLoaded])

  // Auto-save draft
  useEffect(() => {
    if (!draftLoaded) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      if (title || body || tags) {
        try {
          if (typeof chrome !== 'undefined' && chrome.storage) {
            saveDraft({ title, body, tags, updatedAt: Date.now() })
          }
        } catch { /* ignore */ }
      }
    }, 2000)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [title, body, tags, draftLoaded])

  const handlePublish = useCallback(
    async (platform: PlatformKey, draft: PlatformDraft) => {
      setPublishMsg("发布中...")
      try {
        const result = await platformRegistry.get(platform).publish(draft, { platform })
        if ("success" in result && result.success) {
          setPublishMsg("✅ 已打开编辑器并填入内容，请检查知乎标签页")
        } else if ("error" in result) {
          setPublishMsg(`发布失败: ${result.error}`)
        }
      } catch (err) {
        setPublishMsg(`发布失败: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setTimeout(() => setPublishMsg(null), 5000)
      }
    },
    []
  )

  // Direct publish to Zhihu (skip AI transform)
  const handleDirectPublish = useCallback(async () => {
    alert("按钮点击成功！开始发布...")
    if (!body.trim()) {
      setError("请先输入正文内容")
      return
    }

    const draft: PlatformDraft = {
      platformKey: "zhihu",
      title: title.trim(),
      body: body.trim(),
      tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      metadata: {}
    }

    await handlePublish("zhihu", draft)
  }, [title, body, tags, handlePublish])

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
        <InputPanel
          title={title}
          body={body}
          tags={tags}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onTagsChange={setTags}
          onAiRewrite={handleAiRewrite}
          onDirectPublish={handleDirectPublish}
          loading={loading}
        />
        <PreviewPanel results={results} error={error} onPublish={handlePublish} publishMsg={publishMsg} />
      </div>
    </div>
  )
}
