/**
 * Injection function for Zhihu article editor.
 * Serialized by Chrome and injected via chrome.scripting.executeScript.
 * Everything must be inline — no external imports inside func body.
 */
export function zhihuInjectFunc(title: string, body: string): () => void {
  return () => {
    const TIMEOUT = 15000
    const INTERVAL = 200

    async function pollForElement(selector: string): Promise<Element> {
      const start = performance.now()
      while (performance.now() - start < TIMEOUT) {
        const el = document.querySelector(selector)
        if (el) return el
        await new Promise((r) => setTimeout(r, INTERVAL))
      }
      throw new Error('Element "' + selector + '" not found after ' + TIMEOUT + 'ms')
    }

    function fillContenteditable(element: HTMLElement, html: string): void {
      element.focus()
      const range = document.createRange()
      range.selectNodeContents(element)
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(range)
      }
      document.execCommand('insertHTML', false, html)
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
      element.dispatchEvent(
        new CompositionEvent('compositionend', { data: html, bubbles: true })
      )
    }

    function fillInput(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set
      if (nativeSetter) {
        nativeSetter.call(element, value)
      } else {
        element.value = value
      }
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // Main injection flow
    ;(async () => {
      try {
        // Fill title
        const titleEl = await pollForElement('[placeholder="请输入标题"]')
        if (
          titleEl instanceof HTMLInputElement ||
          titleEl instanceof HTMLTextAreaElement
        ) {
          fillInput(titleEl, title)
        } else if (
          titleEl instanceof HTMLElement &&
          titleEl.isContentEditable
        ) {
          fillContenteditable(titleEl, title)
        }

        // Fill body
        const bodyEl = await pollForElement('.public-DraftEditor-content')
        fillContenteditable(bodyEl as HTMLElement, body)

        console.log('[CrossPost] Editor filled successfully')
      } catch (err) {
        console.error('[CrossPost] Injection failed:', err)
      }
    })()
  }
}
