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
      console.log("[CrossPost] publish() called, opening tab...")

      chrome.tabs.create({ url: publishUrl, active: true }, (tab) => {
        if (!tab?.id) {
          console.error("[CrossPost] Failed to create tab")
          resolve({ success: false, error: "Failed to create tab" })
          return
        }

        const tabId = tab.id
        console.log("[CrossPost] Tab created:", tabId, "status:", tab.status)

        let injected = false

        const doInject = () => {
          if (injected) return
          injected = true

          console.log("[CrossPost] Injecting into tab", tabId, "title:", draft.title?.substring(0, 30), "body:", draft.body?.substring(0, 30))

          chrome.scripting.executeScript(
            {
              target: { tabId },
              func: zhihuInject,
              args: [draft.title, draft.body],
              world: "MAIN"
            },
            (results) => {
              const lastError = chrome.runtime.lastError
              console.log("[CrossPost] executeScript callback", {
                hasError: !!lastError,
                errorMsg: lastError?.message,
                results: results
              })

              if (lastError) {
                resolve({
                  success: false,
                  error: lastError.message || "Injection failed"
                })
              } else {
                // results[0].result contains the return value of zhihuInject
                const diagnostic = results?.[0]?.result || "no result"
                console.log("[CrossPost] Injection diagnostic:", diagnostic)

                resolve({
                  success: true,
                  platformPostId: "",
                  url: publishUrl
                })
              }
            }
          )
        }

        // Path A: tab already loaded
        if (tab.status === "complete") {
          console.log("[CrossPost] Tab already complete, injecting immediately")
          doInject()
          return
        }

        // Path B: wait for tab to finish loading
        console.log("[CrossPost] Waiting for tab to load...")
        chrome.tabs.onUpdated.addListener(function listener(
          updatedTabId: number,
          info: { status?: string }
        ) {
          if (updatedTabId !== tabId || info.status !== "complete") return
          console.log("[CrossPost] Tab loaded, injecting")
          chrome.tabs.onUpdated.removeListener(listener)
          doInject()
        })
      })
    })
  }
}
