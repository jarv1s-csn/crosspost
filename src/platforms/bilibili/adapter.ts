import type { IPlatformAdapter } from "../interface"
import type {
  ContentInput,
  PlatformDraft,
  PreviewData,
  PlatformCredentials,
  PublishResult,
} from "../../types"
import { formatBilibiliContent } from "./formatter"
import { bilibiliInject } from "./inject"

const EDITOR_URL = "https://member.bilibili.com/platform/upload/text/new-edit"
const URL_PATTERN = "*://member.bilibili.com/platform/upload/text/*"

function isEditorPage(url: string | undefined): boolean {
  return !!url && url.includes("member.bilibili.com/platform/upload/text/")
}

export class BilibiliAdapter implements IPlatformAdapter {
  readonly displayName = "B站"
  readonly key = "bilibili" as const
  readonly icon = "🎬"

  formatContent(input: ContentInput): PlatformDraft {
    return formatBilibiliContent(input)
  }

  renderPreview(draft: PlatformDraft): PreviewData {
    return {
      title: draft.title,
      body: draft.body,
      tags: draft.tags,
      metadata: { platform: "bilibili", style: "article", titleLimit: 30 },
    }
  }

  async publish(
    draft: PlatformDraft,
    _credentials: PlatformCredentials
  ): Promise<PublishResult> {
    const steps: string[] = []

    try {
      // --- Priority 1: Current active tab is already the editor ---
      steps.push("1. 检查当前标签页")
      const [currentTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })

      if (currentTab?.id && isEditorPage(currentTab.url)) {
        steps.push("1. 当前页即编辑器 #" + currentTab.id)
        console.log("[CrossPost:B站] 当前页是编辑器，直接注入 tab", currentTab.id)

        return this.doInject(currentTab.id, draft, steps)
      }

      // --- Priority 2: Find existing editor tab ---
      steps.push("2. 查找已有B站标签页")
      const existingTabs = await chrome.tabs.query({ url: URL_PATTERN })
      const writeTab = existingTabs.find((t) => isEditorPage(t.url))

      if (writeTab?.id) {
        steps.push("2. 复用已有标签页 #" + writeTab.id)
        // Activate it
        await chrome.tabs.update(writeTab.id, { active: true })

        return this.doInject(writeTab.id, draft, steps)
      }

      // --- Priority 3: Navigate current tab ---
      steps.push("3. 当前页跳转...")
      const tabId = currentTab.id!
      await chrome.tabs.update(tabId, { url: EDITOR_URL })
      steps.push("3. 已跳转 #" + tabId + " → 等待加载")

      return this.doInject(tabId, draft, steps)
    } catch (err) {
      return {
        success: false,
        error:
          (err instanceof Error ? err.message : String(err)) +
          " (" + steps.join(" → ") + ")",
      }
    }
  }

  /** Shared injection logic: wait for load, then executeScript */
  private async doInject(
    tabId: number,
    draft: PlatformDraft,
    steps: string[]
  ): Promise<PublishResult> {
    console.log("[CrossPost:B站] doInject tab", tabId, "title=", draft.title?.length, "body=", draft.body?.length)

    // Wait for page ready
    steps.push("A. 等待页面加载")
    await this.waitForTabReady(tabId)
    steps.push("A. 页面就绪")

    // Inject
    steps.push("B. 注入脚本")
    console.log("[CrossPost:B站] executeScript starting...")

    const result = await new Promise<{
      success: boolean
      diag: string
      error?: string
    }>((resolve) => {
      chrome.scripting.executeScript(
        {
          target: { tabId },
          func: bilibiliInject,
          args: [draft.title, draft.body],
          world: "MAIN",
        },
        (results) => {
          const err = chrome.runtime.lastError
          console.log("[CrossPost:B站] executeScript callback, err=", err, "results=", results)

          if (err) {
            resolve({
              success: false,
              diag: "",
              error: err.message || String(err),
            })
          } else {
            const diag = results?.[0]?.result || "(no result)"
            resolve({ success: true, diag: String(diag) })
          }
        }
      )
    })

    if (result.success) {
      steps.push("B. 注入完成: " + result.diag)
      console.log("[CrossPost:B站] SUCCESS diag=", result.diag)
      return {
        success: true,
        platformPostId: "",
        url: EDITOR_URL,
        tabId: tabId
      }
    } else {
      console.error("[CrossPost:B站] FAIL", result.error)
      return {
        success: false,
        error: "注入失败: " + result.error + " (" + steps.join(" → ") + ")",
      }
    }
  }

  private waitForTabReady(tabId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("页面加载超时(15s)")),
        15000
      )

      chrome.tabs.get(tabId, (tab) => {
        if (tab.status === "complete") {
          clearTimeout(timeout)
          resolve()
          return
        }

        chrome.tabs.onUpdated.addListener(function listener(
          updatedTabId: number,
          info: { status?: string }
        ) {
          if (updatedTabId !== tabId || info.status !== "complete") return
          chrome.tabs.onUpdated.removeListener(listener)
          clearTimeout(timeout)
          resolve()
        })
      })
    })
  }
}
