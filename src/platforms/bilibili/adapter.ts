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
      metadata: {
        platform: "bilibili",
        style: "article",
        titleLimit: 30,
      },
    }
  }

  async publish(
    draft: PlatformDraft,
    _credentials: PlatformCredentials
  ): Promise<PublishResult> {
    const steps: string[] = []

    try {
      // Step 1: Find or create tab
      steps.push("1. 查找B站标签页...")
      const existingTabs = await chrome.tabs.query({
        url: "*://member.bilibili.com/platform/upload/text/*",
      })
      const writeTab = existingTabs.find(
        (t) => t.url && t.url.includes("/text/")
      )

      let tabId: number
      if (writeTab?.id) {
        steps.push("1. 复用已有标签页 #" + writeTab.id)
        tabId = writeTab.id
      } else {
        steps.push("1. 创建新标签页...")
        const tab = await new Promise<chrome.tabs.Tab>(
          (resolve, reject) => {
            chrome.tabs.create(
              {
                url: "https://member.bilibili.com/platform/upload/text/new-edit",
                active: true,
              },
              (t) => {
                if (t) resolve(t)
                else reject(new Error("无法创建标签页"))
              }
            )
          }
        )
        tabId = tab.id!
        steps.push("1. 已创建标签页 #" + tabId)
      }

      // Step 2: Wait for page to be ready
      steps.push("2. 等待页面加载...")
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("页面加载超时")),
          15000
        )

        const check = () => {
          chrome.tabs.get(tabId, (tab) => {
            if (tab.status === "complete") {
              clearTimeout(timeout)
              steps.push("2. 页面加载完成")
              resolve()
              return
            }
            chrome.tabs.onUpdated.addListener(function listener(
              updatedTabId: number,
              info: { status?: string }
            ) {
              if (
                updatedTabId !== tabId ||
                info.status !== "complete"
              )
                return
              chrome.tabs.onUpdated.removeListener(listener)
              clearTimeout(timeout)
              steps.push("2. 页面加载完成")
              resolve()
            })
          })
        }
        check()
      })

      // Step 3: Inject
      steps.push("3. 注入脚本...")
      const result = await new Promise<{
        success: boolean
        diag: string
        error?: string
      }>((resolve) => {
        chrome.scripting.executeScript(
          {
            target: { tabId, frameIds: [0] },
            func: bilibiliInject,
            args: [draft.title, draft.body],
            world: "MAIN",
          },
          (results) => {
            const err = chrome.runtime.lastError
            if (err) {
              resolve({
                success: false,
                diag: "",
                error: err.message || String(err),
              })
            } else {
              const diag = results?.[0]?.result || ""
              resolve({ success: true, diag: String(diag) })
            }
          }
        )
      })

      if (result.success) {
        steps.push("3. 注入完成: " + result.diag)
        return {
          success: true,
          platformPostId: "",
          url: "https://member.bilibili.com/platform/upload/text/new-edit",
        }
      } else {
        return {
          success: false,
          error:
            "注入失败: " +
            result.error +
            " (" +
            steps.join(" → ") +
            ")",
        }
      }
    } catch (err) {
      return {
        success: false,
        error:
          (err instanceof Error ? err.message : String(err)) +
          " (" +
          steps.join(" → ") +
          ")",
      }
    }
  }
}
