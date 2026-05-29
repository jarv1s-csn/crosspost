import type { IPlatformAdapter } from "../interface"
import type { ContentInput, PlatformDraft, PreviewData, PlatformCredentials, PublishResult } from "../../types"
import type { InjectionResult } from "../../utils/dom"
import { formatZhihuContent } from "./formatter"

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
      metadata: {
        platform: "zhihu",
        style: "article",
        titleLimit: 30
      }
    }
  }

  async publish(
    draft: PlatformDraft,
    _credentials: PlatformCredentials
  ): Promise<PublishResult> {
    const publishUrl = "https://zhuanlan.zhihu.com/write"

    return new Promise((resolve) => {
      chrome.tabs.create({ url: publishUrl, active: true }, (tab) => {
        if (!tab?.id) {
          resolve({ success: false, error: "Failed to create tab" })
          return
        }

        const tabId = tab.id

        chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
          if (updatedTabId !== tabId || info.status !== "complete") return

          chrome.tabs.onUpdated.removeListener(listener)

          // Content script's pollForElement handles DOM readiness — no fixed sleep
          chrome.tabs.sendMessage(tabId, {
            type: "CROSSPOST_PUBLISH",
            title: draft.title,
            body: draft.body,
            tags: draft.tags,
            autoSubmit: false // SAFETY: never auto-submit
          }, (response: InjectionResult | undefined) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message || "Message failed" })
            } else if (response?.status === "success") {
              resolve({ success: true, platformPostId: "", url: publishUrl })
            } else {
              resolve({ success: false, error: response?.message || "Unknown error" })
            }
          })
        })
      })
    })
  }
}
