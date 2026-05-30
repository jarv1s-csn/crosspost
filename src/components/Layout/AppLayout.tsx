import React, { useState, useCallback, useEffect, useRef } from "react"
import { TopBar } from "./TopBar"
import { InputPanel } from "./InputPanel"
import { PreviewPanel } from "./PreviewPanel"
import { SettingsPanel } from "./SettingsPanel"
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
  const [saveStatus, setSaveStatus] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"publish" | "settings">("publish")

  // Editor state
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tags, setTags] = useState("")
  const [draftLoaded, setDraftLoaded] = useState(false)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftRef = useRef({ title: "", body: "", tags: "" })

  // Keep ref in sync with state
  draftRef.current = { title, body, tags }

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
            setSaveStatus("已保存 " + new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}))
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

  // Save on unmount — fire immediately when popup closes
  // Uses ref to avoid saving stale values from previous render
  useEffect(() => {
    return () => {
      var d = draftRef.current
      if (d.title || d.body || d.tags) {
        try {
          if (typeof chrome !== 'undefined' && chrome.storage) {
            saveDraft({ title: d.title, body: d.body, tags: d.tags, updatedAt: Date.now() })
          }
        } catch { /* ignore */ }
      }
    }
  }, [])

  const handlePublish = useCallback(
    async (platform: PlatformKey, draft: PlatformDraft) => {
      const names: Record<PlatformKey, string> = { zhihu: "知乎", bilibili: "B站", wechat: "公众号", xiaohongshu: "小红书" }
      setPublishMsg(`[${names[platform]}] 发布中...`)
      try {
        const result = await platformRegistry.get(platform).publish(draft, { platform })
        if ("success" in result && result.success) {
          setPublishMsg(`✅ 已填入${names[platform]}编辑器，请检查对应标签页`)
        } else if ("error" in result) {
          setPublishMsg(`❌ 发布失败: ${result.error}`)
        }
      } catch (err) {
        setPublishMsg(`❌ 发布失败: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setTimeout(() => setPublishMsg(null), 8000)
      }
    },
    []
  )

  // Direct publish to Zhihu (skip AI transform)
  const handleDirectPublish = useCallback(async () => {
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

  // Direct publish to Bilibili (skip AI transform)
  const handleDirectPublishBilibili = useCallback(async () => {
    if (!body.trim()) {
      setError("请先输入正文内容")
      return
    }

    const draft: PlatformDraft = {
      platformKey: "bilibili",
      title: title.trim(),
      body: body.trim(),
      tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      metadata: {}
    }

    await handlePublish("bilibili", draft)
  }, [title, body, tags, handlePublish])

  // Direct publish to WeChat (skip AI transform)
  const handleDirectPublishWechat = useCallback(async () => {
    if (!body.trim()) {
      setError("请先输入正文内容")
      return
    }

    const draft: PlatformDraft = {
      platformKey: "wechat",
      title: title.trim(),
      body: body.trim(),
      tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      metadata: {}
    }

    await handlePublish("wechat", draft)
  }, [title, body, tags, handlePublish])

  // Direct publish to Xiaohongshu (skip AI transform)
  const handleDirectPublishXiaohongshu = useCallback(async () => {
    if (!body.trim()) {
      setError("请先输入正文内容")
      return
    }

    const draft: PlatformDraft = {
      platformKey: "xiaohongshu",
      title: title.trim(),
      body: body.trim(),
      tags: tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
      metadata: {}
    }

    await handlePublish("xiaohongshu", draft)
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
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        saveStatus={saveStatus}
      />
      {activeTab === "publish" ? (
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
            onDirectPublishBilibili={handleDirectPublishBilibili}
            onDirectPublishWechat={handleDirectPublishWechat}
            onDirectPublishXiaohongshu={handleDirectPublishXiaohongshu}
            loading={loading}
          />
          <PreviewPanel results={results} error={error} onPublish={handlePublish} publishMsg={publishMsg} />
        </div>
      ) : (
        <SettingsPanel />
      )}
    </div>
  )
}
