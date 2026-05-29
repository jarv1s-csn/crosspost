import type { IPlatformAdapter } from "../interface"
import type { ContentInput, PlatformDraft, PreviewData, PlatformCredentials, PublishResult } from "../../types"
import { formatZhihuContent } from "./formatter"
import { zhihuInjectFunc } from "./inject"

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

          chrome.scripting.executeScript(
            {
              target: { tabId },
              func: zhihuInjectFunc(draft.title, draft.body),
              world: "MAIN"
            },
            () => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || "Injection failed"
                })
              } else {
                resolve({
                  success: true,
                  platformPostId: "",
                  url: publishUrl
                })
              }
            }
          )
        })
      })
    })
  }
}
