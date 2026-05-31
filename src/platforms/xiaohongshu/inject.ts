/**
 * Injection function for Xiaohongshu 写长文 editor.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 *
 * Editor page: /publish/publish?target=article
 * Title: TEXTAREA placeholder="输入标题"
 * Body: ProseMirror (TipTap) → pmEl.editor.chain().setContent(html)
 */

export function xiaohongshuInject(title: string, body: string): Promise<string> {
  if ((window as any).__crosspost_injected__) return Promise.resolve('SKIP')
  ;(window as any).__crosspost_injected__ = true

  var TIMEOUT = 60000
  var INTERVAL = 200

  function log(msg: string) {
    console.log("[CrossPost:小红书] " + msg)
  }

  function textToHTML(text: string): string {
    var paragraphs = text.split(/\n\s*\n/)
    var result = ""
    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i].trim()
      if (!p) continue
      result += "<p>" + p.replace(/\n/g, "<br>") + "</p>"
    }
    return result || "<p>" + text + "</p>"
  }

  function poll(checkFn: () => any, label: string): Promise<any> {
    return new Promise(function (resolve, reject) {
      var start = performance.now()
      function tick() {
        if (performance.now() - start >= TIMEOUT) {
          reject(new Error(label + " TIMEOUT"))
          return
        }
        try {
          var result = checkFn()
          if (result) {
            log(label + " FOUND")
            resolve(result)
            return
          }
        } catch (e) { /* retry */ }
        setTimeout(tick, INTERVAL)
      }
      tick()
    })
  }

  log("START title=" + (title ? title.length : 0) + " body=" + (body ? body.length : 0))

  // Step 1: Click "新的创作" button to enter the editor
  var clickNewCreation: Promise<void> = poll(function () {
    var candidates = document.querySelectorAll("span, button, a")
    for (var i = 0; i < candidates.length; i++) {
      var text = (candidates[i] as HTMLElement).textContent
      if (text) {
        text = text.trim()
        if (text === "新的创作" || text === "新创作" || text === "新建") {
          return candidates[i] as HTMLElement
        }
      }
    }
    return null
  }, "新的创作 button")
    .then(function (btn: HTMLElement) {
      btn.click()
      log("新的创作 clicked")
    })
    .catch(function (e: any) {
      log("新的创作 not found, proceeding anyway: " + (e.message || String(e)))
    })

  // Step 2: After click, poll for ProseMirror editor
  return clickNewCreation.then(function () {
    return poll(function () {
      var pm = document.querySelector(".ProseMirror") as HTMLElement & { editor?: any }
      if (pm && pm.editor && typeof pm.editor.chain === "function") {
        return pm
      }
      return null
    }, "ProseMirror.editor")
      .then(function (pm: any) {
        log("ProseMirror READY")

        // Fill body
        if (body) {
          try {
            var html = textToHTML(body)
            pm.editor.chain().focus().setContent(html).run()
            log("BODY filled: " + body.length + " chars → " + html.length + " HTML")
          } catch (e: any) {
            log("BODY ERROR: " + (e.message || String(e)))
          }
        }

        // Fill title — TEXTAREA placeholder="输入标题"
        if (title) {
          var titleEl = document.querySelector(
            'textarea[placeholder*="输入标题"], textarea[placeholder*="标题"]'
          ) as HTMLTextAreaElement
          if (titleEl) {
            var desc = Object.getOwnPropertyDescriptor(
              HTMLTextAreaElement.prototype,
              "value"
            )
            if (desc && desc.set) {
              desc.set.call(titleEl, title)
            } else {
              titleEl.value = title
            }
            titleEl.dispatchEvent(new Event("input", { bubbles: true }))
            titleEl.dispatchEvent(new Event("change", { bubbles: true }))
            log("TITLE filled: " + title.length + " chars")
          } else {
            log("TITLE element not found")
          }
        }

        log("DONE")
        return "OK"
      })
      .catch(function (e: any) {
        log("FATAL: " + (e.message || String(e)))
        return "ERROR: " + (e.message || String(e))
      })
  })
}
