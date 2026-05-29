/**
 * Injection function for Zhihu article editor.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 * MUST be self-contained — no async/await, no closure references, globals only.
 *
 * Logs every step to the PAGE console (F12 on the Zhihu tab).
 */
export function zhihuInject(title: string, body: string): Promise<string> {
  const TIMEOUT = 15000
  const INTERVAL = 200

  function log(msg: string) {
    console.log('[CrossPost] ' + msg)
  }

  function pollForElement(selector: string): Promise<Element> {
    return new Promise(function (resolve, reject) {
      const start = performance.now()
      function check() {
        if (performance.now() - start >= TIMEOUT) {
          reject(new Error('"' + selector + '" not found after ' + TIMEOUT + 'ms'))
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
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
    nativeSetter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function fillDraftEditor(editorEl: HTMLElement, text: string): string {
    const fiberKey = Object.keys(editorEl).find(function (k) {
      return k.indexOf('__reactFiber') === 0
    })
    if (!fiberKey) return 'ERR_NO_FIBER'

    let fiber: any = (editorEl as any)[fiberKey]
    let depth = 0
    while (fiber && depth < 50) {
      const sn = fiber.stateNode
      if (sn && typeof sn.props === 'object' && typeof sn.props.onChange === 'function') {
        const es = sn.props.editorState || (sn.state && sn.state.editorState)
        if (!es || typeof es.getCurrentContent !== 'function') {
          fiber = fiber.return; depth++; continue
        }
        const EditorState = Object.getPrototypeOf(es).constructor
        const ContentState = es.getCurrentContent().constructor
        if (typeof ContentState.createFromText !== 'function') {
          return 'ERR_NO_CREATE_FROM_TEXT'
        }
        const newContent = ContentState.createFromText(text)
        const newState = EditorState.push(es, newContent, 'insert-characters')
        sn.props.onChange(newState)
        log('Draft.js filled at depth ' + depth + ', chars: ' + text.length)
        return 'OK'
      }
      fiber = fiber.return
      depth++
    }
    return 'ERR_NO_ONCHANGE'
  }

  log('START title=' + (title ? title.length : 0) + ' body=' + (body ? body.length : 0))

  return pollForElement('.public-DraftEditor-content').then(function (editorEl) {
    log('FOUND .public-DraftEditor-content')

    const promises: Promise<any>[] = []

    if (body) {
      try {
        const bodyResult = fillDraftEditor(editorEl as HTMLElement, body)
        log('BODY: ' + bodyResult)
      } catch (e: any) {
        log('BODY_ERROR: ' + (e.message || String(e)))
      }
    } else {
      log('BODY: skipped')
    }

    if (title) {
      promises.push(
        pollForElement('textarea[placeholder*="请输入标题"]').then(function (titleEl) {
          fillInputValue(titleEl as HTMLTextAreaElement, title)
          log('TITLE: filled')
        })
      )
    } else {
      log('TITLE: skipped')
    }

    return Promise.all(promises).then(function () {
      log('DONE')
      return 'OK'
    })
  }).catch(function (err: any) {
    log('FATAL: ' + (err && err.message ? err.message : String(err)))
    return 'ERROR'
  })
}
