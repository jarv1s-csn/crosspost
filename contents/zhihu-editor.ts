import type { PlasmoCSConfig } from "plasmo"
import { pollForElement, fillContenteditable, fillInput, tryClick, type InjectionResult } from "../src/utils/dom"
import { ZHIHU_SELECTORS, POLL_TIMEOUT, POLL_INTERVAL } from "../src/platforms/zhihu/selectors"

export const config: PlasmoCSConfig = {
  matches: ["https://zhuanlan.zhihu.com/write*", "https://zhuanlan.zhihu.com/edit/*"],
  run_at: "document_idle"
}

interface PublishMessage {
  type: "CROSSPOST_PUBLISH"
  title: string
  body: string
  tags: string[]
  autoSubmit: boolean
}

async function fillEditor(title: string, body: string): Promise<InjectionResult> {
  try {
    // Fill title
    const titleEl = await pollForElement(ZHIHU_SELECTORS.TITLE, POLL_TIMEOUT, POLL_INTERVAL)
    if (titleEl instanceof HTMLInputElement || titleEl instanceof HTMLTextAreaElement) {
      fillInput(titleEl, title)
    } else if (titleEl instanceof HTMLElement && titleEl.isContentEditable) {
      fillContenteditable(titleEl, title)
    }

    // Fill body
    const bodyEl = await pollForElement(ZHIHU_SELECTORS.BODY, POLL_TIMEOUT, POLL_INTERVAL)
    if (bodyEl instanceof HTMLElement) {
      fillContenteditable(bodyEl, body)
    } else {
      return { status: 'error', message: 'Body element is not editable' }
    }

    return { status: 'success', message: 'Editor filled successfully' }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Unknown error filling editor' }
  }
}

async function clickPublish(): Promise<InjectionResult> {
  const clicked = tryClick(ZHIHU_SELECTORS.PUBLISH_BUTTON) ||
                  tryClick(ZHIHU_SELECTORS.PUBLISH_BUTTON_FALLBACK)
  if (!clicked) {
    return { status: 'error', message: 'Publish button not found' }
  }
  return { status: 'success', message: 'Publish button clicked' }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message: PublishMessage, _sender, sendResponse) => {
  if (message.type !== "CROSSPOST_PUBLISH") return

  // Handle async
  ;(async () => {
    // Step 1: Fill the editor
    const fillResult = await fillEditor(message.title, message.body)
    if (fillResult.status === 'error') {
      sendResponse(fillResult)
      return
    }

    // Step 2: Auto-submit if enabled (default: disabled for safety)
    if (message.autoSubmit) {
      const submitResult = await clickPublish()
      sendResponse(submitResult)
    } else {
      sendResponse({ status: 'success', message: 'Editor filled (auto-submit disabled). Review and publish manually.' })
    }
  })()

  return true // Keep message channel open for async response
})
