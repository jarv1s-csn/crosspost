import type { IPlatformAdapter } from "../interface"
import type { ContentInput, PlatformDraft, PreviewData, PlatformCredentials, PublishResult } from "../../types"
import { formatZhihuContent } from "./formatter"
import { pingTest } from "./inject"

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
        let injected = false

        const doInject = () => {
          if (injected) return
          injected = true

          // STEP 1: Ping test — verify executeScript works
          chrome.scripting.executeScript(
            {
              target: { tabId },
              func: pingTest,
              args: ["STEP1-" + Date.now()],
              world: "MAIN"
            },
            (results) => {
              const err1 = chrome.runtime.lastError
              console.log("[CrossPost] PING result:", { err: err1?.message, result: results?.[0]?.result })

              if (err1) {
                resolve({ success: false, error: "PING failed: " + err1.message })
                return
              }

              // STEP 2: Real injection (placeholder — test pings only for now)
              resolve({
                success: true,
                platformPostId: "",
                url: publishUrl
              })
            }
          )
        }

        if (tab.status === "complete") {
          doInject()
          return
        }

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
