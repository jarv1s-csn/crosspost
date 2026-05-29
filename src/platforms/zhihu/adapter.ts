import type { IPlatformAdapter } from "../interface"
import type { ContentInput, PlatformDraft, PreviewData, PlatformCredentials, PublishResult } from "../../types"
import { formatZhihuContent } from "./formatter"
import { zhihuInject } from "./inject"

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

        // Guards against double-injection if both race paths fire
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
        }

        // Path A: tab already loaded (cache hit, fast network, etc.)
        if (tab.status === "complete") {
          doInject()
          return
        }

        // Path B: wait for tab to finish loading
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
  }
}
