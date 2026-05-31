import React, { useState, useCallback, useEffect, useRef } from "react"
import { TopBar } from "./TopBar"
import { InputPanel } from "./InputPanel"
import { PreviewPanel } from "./PreviewPanel"
import { SettingsPanel } from "./SettingsPanel"
import { transformAllPlatforms } from "../../ai"
import type { PlatformDraft, PlatformKey, PublishStatus } from "../../types"
import { saveApiKey, loadApiKey, saveDraft, loadDraft, saveResults, loadResults } from "../../storage"
import { loadProvider, loadCustomEndpoint, loadCustomModel } from "../../storage"
import { platformRegistry } from "../../platforms"

type PublishState = {
  status: PublishStatus
  message: string
  tabId?: number
}

const IDLE_STATE: PublishState = { status: "idle", message: "" }

export function AppLayout() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Partial<Record<PlatformKey, PlatformDraft>>>({})
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [publishMsg, setPublishMsg] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"publish" | "settings">("publish")
  const [publishStates, setPublishStates] = useState<Record<PlatformKey, PublishState>>({
    zhihu: IDLE_STATE,
    bilibili: IDLE_STATE,
    wechat: IDLE_STATE,
    xiaohongshu: IDLE_STATE
  })

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

        loadProvider().catch(() => {})
        loadCustomEndpoint().catch(() => {})
        loadCustomModel().catch(() => {})

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

  const handleManualSave = useCallback(() => {
    const d = draftRef.current
    if (d.title || d.body || d.tags) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          saveDraft({ title: d.title, body: d.body, tags: d.tags, updatedAt: Date.now() })
          setSaveStatus("已保存 " + new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}))
        }
      } catch { /* ignore */ }
    }
  }, [])

  const handlePublish = useCallback(
    async (platform: PlatformKey, draft: PlatformDraft) => {
      const names: Record<PlatformKey, string> = { zhihu: "知乎", bilibili: "B站", wechat: "公众号", xiaohongshu: "小红书" }
      setPublishStates(prev => ({ ...prev, [platform]: { status: "publishing", message: "发布中..." } }))
      try {
        const result = await platformRegistry.get(platform).publish(draft, { platform })
        if (result.success) {
          setPublishStates(prev => ({
            ...prev,
            [platform]: { status: "published", message: `✅ 已填入${names[platform]}编辑器`, tabId: result.tabId }
          }))
        } else {
          setPublishStates(prev => ({
            ...prev,
            [platform]: { status: "failed", message: `❌ ${result.error}` }
          }))
        }
      } catch (err) {
        setPublishStates(prev => ({
          ...prev,
          [platform]: { status: "failed", message: `❌ ${err instanceof Error ? err.message : String(err)}` }
        }))
      }
    },
    []
  )

  const handleAiRewrite = useCallback(
    async (input: { title: string; body: string; tags: string[] }) => {
      if (!apiKey.trim()) {
        setError("请先输入 API Key")
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
          saveResults(data as Record<string, unknown>).catch(() => {})
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
        onSave={handleManualSave}
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
            loading={loading}
          />
          <PreviewPanel results={results} error={error} onPublish={handlePublish} publishStates={publishStates}
            rawTitle={title} rawBody={body} rawTags={tags} />
        </div>
      ) : (
        <SettingsPanel />
      )}
    </div>
  )
}
