/**
 * Injection function for Zhihu article editor (Draft.js based).
 * Serialized by Chrome and injected via chrome.scripting.executeScript.
 * 
 * KEY FINDING: Zhihu editor uses a SINGLE Draft.js contenteditable div
 * for both title and body. There is NO separate title input element.
 * The title is the first line of text, body follows after a blank line.
 */
export function zhihuInject(title: string, body: string): void {
  const TIMEOUT = 15000
  const INTERVAL = 200

  async function pollForElement(selector: string): Promise<Element> {
    const start = performance.now()
    while (performance.now() - start < TIMEOUT) {
      const el = document.querySelector(selector)
      if (el) return el
      await new Promise((r) => setTimeout(r, INTERVAL))
    }
    throw new Error(
      'Element "' + selector + '" not found after ' + TIMEOUT + "ms"
    )
  }

  /**
   * Fill a Draft.js contenteditable editor.
   * Draft.js intercepts native editing commands, so we:
   * 1. Focus the editor
   * 2. Select all existing content
   * 3. Use execCommand('insertText') which Draft.js captures
   * 4. Dispatch events to sync Draft.js internal state
   */
  function fillDraftEditor(element: HTMLElement, text: string): void {
    element.focus()

    // Select all existing content
    const range = document.createRange()
    range.selectNodeContents(element)
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(range)
    }

    // Use insertText — Draft.js captures this via handleBeforeInput
    // Split into chunks if text is very long (Draft.js has paste limits)
    const CHUNK_SIZE = 2000
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      const chunk = text.slice(i, i + CHUNK_SIZE)
      document.execCommand("insertText", false, chunk)
    }

    // Dispatch events so Draft.js commits its internal state
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
    element.dispatchEvent(
      new CompositionEvent("compositionend", { data: text, bubbles: true })
    )
  }

  // Main injection flow
  ;(async () => {
    try {
      // Zhihu has one Draft.js editor for both title + body
      const editorEl = await pollForElement(".public-DraftEditor-content")

      // Title goes on first line, blank line, then body
      const content = title ? title + "\n\n" + body : body

      fillDraftEditor(editorEl as HTMLElement, content)

      console.log("[CrossPost] Editor filled successfully")
    } catch (err) {
      console.error("[CrossPost] Injection failed:", err)
    }
  })()
}
