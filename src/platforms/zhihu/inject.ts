/**
 * Injection function for Zhihu article editor.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 * MUST be self-contained — no async/await, no closure references, globals only.
 *
 * Title: standalone TEXTAREA with placeholder "请输入标题"
 * Body: Draft.js contenteditable .public-DraftEditor-content
 */

export function zhihuInject(title: string, body: string): Promise<string> {
  if ((window as any).__crosspost_injected__) return Promise.resolve('SKIP')
  ;(window as any).__crosspost_injected__ = true

  var TIMEOUT = 60000
  var INTERVAL = 200

  function log(msg: string) {
    console.log("[CrossPost] " + msg)
  }

  function pollForElement(selector: string): Promise<Element> {
    return new Promise(function (resolve, reject) {
      var start = performance.now()
      function check() {
        if (performance.now() - start >= TIMEOUT) {
          reject(new Error('"' + selector + '" TIMEOUT'))
          return
        }
        var el = document.querySelector(selector)
        if (el) { resolve(el); return }
        setTimeout(check, INTERVAL)
      }
      check()
    })
  }

  function fillInputNative(el: HTMLTextAreaElement | HTMLInputElement, value: string): void {
    var proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    var desc = Object.getOwnPropertyDescriptor(proto, 'value')
    if (desc && desc.set) desc.set.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function fillDraftEditor(editorEl: HTMLElement, text: string): string {
    var fiberKey
    var keys = Object.keys(editorEl)
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('__reactFiber') === 0) { fiberKey = keys[i]; break }
    }
    if (!fiberKey) return 'ERR_NO_FIBER'

    var fiber = (editorEl as any)[fiberKey]
    var depth = 0
    while (fiber && depth < 50) {
      var sn = fiber.stateNode
      if (sn && typeof sn.props === 'object' && typeof sn.props.onChange === 'function') {
        var es = sn.props.editorState || (sn.state && sn.state.editorState)
        if (!es || typeof es.getCurrentContent !== 'function') {
          fiber = fiber.return; depth++; continue
        }
        var EditorState = Object.getPrototypeOf(es).constructor
        var ContentState = es.getCurrentContent().constructor
        if (typeof ContentState.createFromText !== 'function') {
          return 'ERR_NO_CREATE_FROM_TEXT'
        }
        var newContent = ContentState.createFromText(text)
        var newState = EditorState.push(es, newContent, 'insert-characters')
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

    // Fill body (Draft.js only, no title)
    if (body) {
      try {
        var bodyResult = fillDraftEditor(editorEl as HTMLElement, body)
        log('BODY: ' + bodyResult)
        if (bodyResult === 'ERR_NO_FIBER' || bodyResult === 'ERR_NO_ONCHANGE') {
          var pasteEvent = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
          Object.defineProperty(pasteEvent, 'clipboardData', { value: new DataTransfer() })
          pasteEvent.clipboardData.setData('text/html', body.replace(/\n/g, '<br>'))
          ;(editorEl as HTMLElement).dispatchEvent(pasteEvent)
          log('BODY: ClipboardEvent fallback')
          bodyResult = 'OK_FALLBACK'
        }
      } catch (e: any) {
        log('BODY_ERROR: ' + (e.message || String(e)))
      }
    } else {
      log('BODY: skipped')
    }

    // Fill title in separate TEXTAREA
    var titlePromise = title
      ? pollForElement('textarea[placeholder*="请输入标题"]').then(function (titleEl) {
          fillInputNative(titleEl as HTMLTextAreaElement, title)
          log('TITLE: filled')
        }).catch(function (e: any) {
          log('TITLE ERROR: ' + (e.message || String(e)))
        })
      : Promise.resolve()

    return titlePromise.then(function () {
      log('DONE')
      return 'OK'
    })
  }).catch(function (err: any) {
    log('FATAL: ' + (err && err.message ? err.message : String(err)))
    return 'ERROR'
  })
}
