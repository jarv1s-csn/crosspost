import type { IPlatformAdapter } from "../interface"
import type { ContentInput, PlatformDraft, PreviewData, PlatformCredentials, PublishResult } from "../../types"
import { formatZhihuContent } from "./formatter"
import { zhihuInject } from "./inject"

const ZHIHU_URL_PATTERN = "zhuanlan.zhihu.com"

export class ZhihuAdapter implements IPlatformAdapter {
  readonly displayName = "知乎"
  readonly key = "zhihu" as const
  readonly icon = "💡"

  formatContent(input: ContentInput): PlatformDraft {
    return formatZhihuContent(input)
  }

  renderPreview(draft: PlatformDraft): PreviewData {
    return {
      title: draft.title,
      body: draft.body,
      tags: draft.tags,
      metadata: { platform: "zhihu", style: "article", titleLimit: 30 }
    }
  }

  /**
   * Find an existing Zhihu editor tab or create a new one.
   * Reuses existing tabs so the user can keep DevTools open.
   */
  private async findOrCreateTab(): Promise<number> {
    // Look for existing Zhihu editor tabs
    const tabs = await chrome.tabs.query({ url: "*://zhuanlan.zhihu.com/*" })
    const writeTab = tabs.find(
      (t) => t.url && (t.url.includes("/write") || t.url.includes("/edit"))
    )

    if (writeTab?.id) {
      // Reuse existing tab — navigate to fresh write page
      await chrome.tabs.update(writeTab.id, {
        url: "https://zhuanlan.zhihu.com/write",
        active: true
      })
      return writeTab.id
    }

    // Create new tab
    return new Promise((resolve, reject) => {
      chrome.tabs.create(
        { url: "https://zhuanlan.zhihu.com/write", active: true },
        (tab) => {
          if (!tab?.id) reject(new Error("Failed to create tab"))
          else resolve(tab.id)
        }
      )
    })
  }

  async publish(
    draft: PlatformDraft,
    _credentials: PlatformCredentials
  ): Promise<PublishResult> {
    try {
      const tabId = await this.findOrCreateTab()

      return new Promise((resolve) => {
        let injected = false

        const doInject = () => {
          if (injected) return
          injected = true

          chrome.scripting.executeScript(
            {
              target: { tabId },
              func: zhihuInject,
              args: [draft.title, draft.body],
              world: "MAIN"
            },
            (results) => {
              const err = chrome.runtime.lastError
              if (err) {
                console.error("[CrossPost] executeScript error:", err.message)
                resolve({ success: false, error: err.message })
              } else {
                const diag = results?.[0]?.result || "no diagnostic"
                console.log("[CrossPost] Inject done, diagnostic:", diag)
                resolve({ success: true, platformPostId: "", url: "https://zhuanlan.zhihu.com/write" })
              }
            }
          )
        }

        // Check if tab is already loaded
        chrome.tabs.get(tabId, (tab) => {
          if (tab.status === "complete") {
            doInject()
            return
          }

          // Wait for load
          chrome.tabs.onUpdated.addListener(function listener(
            updatedTabId: number,
            info: { status?: string }
          ) {
            if (updatedTabId !== tabId || info.status !== "complete") return
            chrome.tabs.onUpdated.removeListener(listener)
            doInject()
          })
        })
      })
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error"
      }
    }
  }
}
