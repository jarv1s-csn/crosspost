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
 * IMPORTANT: This function is serialized by chrome.scripting.executeScript()
 * with { func, world: "MAIN" }. Chrome's func serialization calls .toString()
 * on the function. After Parcel bundling, async/await may be transpiled into
 * generator-based state machines that reference module-scoped helpers.
 *
 * To avoid serialization issues:
 *   - NO async/await — use raw Promise chains
 *   - ALL helpers defined inline within the function body
 *   - NO closure references to module scope or imports
 *   - Only use global APIs (document, console, Object, etc.)
 */
export function zhihuInject(title: string, body: string): void {
  const TIMEOUT = 15000
  const INTERVAL = 200

  function pollForElement(selector: string): Promise<Element> {
    return new Promise(function (resolve, reject) {
      const start = performance.now()
      function check() {
        if (performance.now() - start >= TIMEOUT) {
          reject(new Error('Element "' + selector + '" not found after ' + TIMEOUT + 'ms'))
          return
        }
        const el = document.querySelector(selector)
        if (el) { resolve(el); return }
        setTimeout(check, INTERVAL)
      }
      check()
    })
  }

  function fillInputValue(el: HTMLTextAreaElement | HTMLInputElement, value: string): void {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
    nativeSetter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function fillDraftEditor(editorEl: HTMLElement, text: string): void {
    const fiberKey = Object.keys(editorEl).find(function (k) {
      return k.indexOf('__reactFiber') === 0
    })
    if (!fiberKey) throw new Error('No React fiber found on Draft.js editor')

    let fiber: any = (editorEl as any)[fiberKey]
    let found = false

    while (fiber && !found) {
      const sn = fiber.stateNode
      if (
        sn &&
        typeof sn.props === 'object' &&
        typeof sn.props.onChange === 'function'
      ) {
        const es =
          sn.props.editorState || (sn.state && sn.state.editorState)
        if (!es || typeof es.getCurrentContent !== 'function') {
          fiber = fiber.return
          continue
        }

        const EditorState = Object.getPrototypeOf(es).constructor
        const ContentState = es.getCurrentContent().constructor

        const newContent = ContentState.createFromText(text)
        const newState = EditorState.push(
          es,
          newContent,
          'insert-characters'
        )

        sn.props.onChange(newState)
        found = true
        console.log('[CrossPost] Editor filled via Draft.js API')
      }
      fiber = fiber.return
    }

    if (!found) throw new Error('Could not find Draft.js onChange handler')
  }

  // === Main flow (Promise chain, NO async/await) ===
  pollForElement('.public-DraftEditor-content')
    .then(function (editorEl) {
      const el = editorEl as HTMLElement

      // Fill body via Draft.js API
      if (body) {
        fillDraftEditor(el, body)
      }

      // Fill title if present
      if (title) {
        return pollForElement('textarea[placeholder*="请输入标题"]').then(
          function (titleEl) {
            fillInputValue(titleEl as HTMLTextAreaElement, title)
            console.log('[CrossPost] Title filled')
          }
        )
      }
    })
    .then(function () {
      console.log('[CrossPost] Injection complete')
    })
    .catch(function (err: any) {
      console.error(
        '[CrossPost] Injection failed:',
        err && err.message ? err.message : String(err)
      )
    })
}
