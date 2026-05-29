/**
 * Injection function for Zhihu article editor.
 *
 * Zhihu editor structure (verified 2026-05-29):
 *   - Title: standalone <TEXTAREA> with placeholder "请输入标题（最多 100 个字）"
 *   - Body:  Draft.js contenteditable (.public-DraftEditor-content)
 *
 * Approach:
 *   1. Fill title TEXTAREA via native value setter + input/change events
 *   2. Walk React fiber tree from Draft.js DOM node → find component with
 *      props.onChange + props.editorState → create new EditorState via
 *      Draft.js API → call onChange to trigger React re-render.
 *
 * Serialized by chrome.scripting.executeScript({ func, args, world: "MAIN" }).
 * Must be self-contained — no closure references to module scope.
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
      'Element "' + selector + '" not found after ' + TIMEOUT + 'ms'
    )
  }

  /**
   * Fill a <TEXTAREA> or <input> with value using native setter.
   * Bypasses React's synthetic event system so the controlled component
   * picks up the value change.
   */
  function fillInputValue(el: HTMLTextAreaElement | HTMLInputElement, value: string): void {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
    nativeSetter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /**
   * Fill Draft.js editor via React fiber + Draft.js API.
   * Finds the component holding editorState + onChange, creates new state,
   * and triggers React re-render.
   */
  function fillDraftEditor(editorEl: HTMLElement, text: string): void {
    // Find React fiber key on the DOM node
    const fiberKey = Object.keys(editorEl).find((k) => k.startsWith('__reactFiber'))
    if (!fiberKey) throw new Error('No React fiber found on Draft.js editor')

    // Walk up fiber tree to find component with editorState + onChange
    let fiber: any = (editorEl as any)[fiberKey]
    let found = false

    while (fiber && !found) {
      const sn = fiber.stateNode
      if (sn && typeof sn.props === 'object' && typeof sn.props.onChange === 'function') {
        const es = sn.props.editorState || (sn.state && sn.state.editorState)
        if (!es || typeof es.getCurrentContent !== 'function') {
          fiber = fiber.return
          continue
        }

        // Get Draft.js constructors from the live instance
        const EditorState = Object.getPrototypeOf(es).constructor
        const ContentState = es.getCurrentContent().constructor

        // Create new editor state from plain text
        const newContent = ContentState.createFromText(text)
        const newState = EditorState.push(es, newContent, 'insert-characters')

        // Trigger React re-render
        sn.props.onChange(newState)
        found = true
        console.log('[CrossPost] Editor filled via Draft.js API')
      }
      fiber = fiber.return
    }

    if (!found) throw new Error('Could not find Draft.js onChange handler')
  }

  // Main injection flow
  ;(async () => {
    try {
      // Step 1: Fill title TEXTAREA
      if (title) {
        // Use partial attribute match for robustness against placeholder text changes
        const titleEl = await pollForElement('textarea[placeholder*="请输入标题"]')
        fillInputValue(titleEl as HTMLTextAreaElement, title)
        console.log('[CrossPost] Title filled')
      }

      // Step 2: Fill Draft.js body editor
      if (body) {
        const editorEl = await pollForElement('.public-DraftEditor-content')
        fillDraftEditor(editorEl as HTMLElement, body)
      }

      console.log('[CrossPost] Injection complete')
    } catch (err: any) {
      console.error('[CrossPost] Injection failed:', err.message || err)
    }
  })()
}
