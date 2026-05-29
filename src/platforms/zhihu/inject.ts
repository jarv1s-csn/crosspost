/**
 * Injection function for Zhihu article editor.
 *
 * This function is serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 * MUST be self-contained — no closure references, no async/await (to avoid
 * regenerator references after bundling), only use global APIs.
 *
 * Returns a diagnostic string to help debug injection failures.
 */
export function zhihuInject(title: string, body: string): Promise<string> {
  const TIMEOUT = 15000
  const INTERVAL = 200

  function pollForElement(selector: string): Promise<Element> {
    return new Promise(function (resolve, reject) {
      const start = performance.now()
      function check() {
        if (performance.now() - start >= TIMEOUT) {
          reject(
            new Error(
              'Element "' + selector + '" not found after ' + TIMEOUT + 'ms'
            )
          )
          return
        }
        const el = document.querySelector(selector)
        if (el) {
          resolve(el)
          return
        }
        setTimeout(check, INTERVAL)
      }
      check()
    })
  }

  function fillInputValue(
    el: HTMLTextAreaElement | HTMLInputElement,
    value: string
  ): void {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
    const nativeSetter = Object.getOwnPropertyDescriptor(
      proto,
      'value'
    )!.set!
    nativeSetter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function fillDraftEditor(editorEl: HTMLElement, text: string): string {
    const fiberKey = Object.keys(editorEl).find(function (k) {
      return k.indexOf('__reactFiber') === 0
    })
    if (!fiberKey) return 'ERR: no React fiber on Draft.js element'

    let fiber: any = (editorEl as any)[fiberKey]
    let found = false
    let depth = 0

    while (fiber && !found && depth < 50) {
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
          depth++
          continue
        }

        const EditorState = Object.getPrototypeOf(es).constructor
        const ContentState = es.getCurrentContent().constructor

        if (typeof ContentState.createFromText !== 'function') {
          return 'ERR: ContentState.createFromText not a function'
        }

        const newContent = ContentState.createFromText(text)
        const newState = EditorState.push(
          es,
          newContent,
          'insert-characters'
        )

        sn.props.onChange(newState)
        found = true
        console.log(
          '[CrossPost] Draft.js filled at depth ' +
            depth +
            ', text length: ' +
            text.length
        )
      }
      fiber = fiber.return
      depth++
    }

    return found ? 'OK' : 'ERR: onChange handler not found in fiber tree'
  }

  // === Main diagnostic flow ===
  return new Promise(function (resolve) {
    var log: string[] = []
    log.push('START: title=' + (title ? title.length : 0) + ' body=' + (body ? body.length : 0))

    pollForElement('.public-DraftEditor-content')
      .then(function (editorEl) {
        var el = editorEl as HTMLElement
        log.push('FOUND: Draft.js editor')

        if (body) {
          var bodyResult = fillDraftEditor(el, body)
          log.push('BODY: ' + bodyResult)
        } else {
          log.push('BODY: skipped (empty)')
        }

        if (title) {
          return pollForElement(
            'textarea[placeholder*="请输入标题"]'
          ).then(function (titleEl) {
            fillInputValue(titleEl as HTMLTextAreaElement, title)
            log.push('TITLE: filled')
            return log
          })
        } else {
          log.push('TITLE: skipped (empty)')
          return log
        }
      })
      .then(function () {
        log.push('DONE')
        resolve(log.join(' | '))
      })
      .catch(function (err: any) {
        log.push(
          'ERROR: ' +
            (err && err.message ? err.message : String(err))
        )
        resolve(log.join(' | '))
      })
  })
}
