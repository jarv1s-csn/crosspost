/**
 * Poll for an element to appear in the DOM.
 * Checks every `interval` ms, throws if not found within `timeout` ms.
 */
export async function pollForElement(
  selector: string,
  timeout = 15000,
  interval = 200
): Promise<Element> {
  const start = performance.now()

  while (performance.now() - start < timeout) {
    const el = document.querySelector(selector)
    if (el) return el
    await new Promise((r) => setTimeout(r, interval))
  }

  throw new Error(`Element "${selector}" not found after ${timeout}ms`)
}

/**
 * Fill a contenteditable element with HTML content.
 * Uses execCommand for rich text, dispatches input event to trigger React/Draft.js state sync.
 */
export function fillContenteditable(element: HTMLElement, html: string): void {
  element.focus()

  // Select all existing content and replace
  const range = document.createRange()
  range.selectNodeContents(element)
  const selection = window.getSelection()
  if (selection) {
    selection.removeAllRanges()
    selection.addRange(range)
  }

  // Use execCommand for rich text insertion
  document.execCommand('insertHTML', false, html)

  // Dispatch events so React/Draft.js detects the change
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))

  // Also dispatch compositionend for Draft.js compatibility
  element.dispatchEvent(new CompositionEvent('compositionend', {
    data: html,
    bubbles: true
  }))
}

/**
 * Fill a regular input element and dispatch events.
 */
export function fillInput(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  // Use native setter to trigger React's synthetic event system
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, 'value'
  )?.set
  if (nativeSetter) {
    nativeSetter.call(element, value)
  } else {
    element.value = value
  }

  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Attempt to click a button. Returns false if element not found.
 */
export function tryClick(selector: string): boolean {
  const el = document.querySelector(selector)
  if (el instanceof HTMLElement) {
    el.click()
    return true
  }
  return false
}

/**
 * Structured result type for injection operations.
 */
export interface InjectionResult {
  status: 'success' | 'error'
  message: string
}
