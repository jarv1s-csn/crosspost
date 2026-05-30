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

  // Poll for ProseMirror editor (page has it directly, no button click needed)
  return poll(function () {
    var pm = document.querySelector(
      ".ProseMirror"
    ) as HTMLElement & { editor?: any }
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
}
