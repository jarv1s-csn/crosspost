/**
 * Injection function for Bilibili article editor.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 * MUST be self-contained — no async/await, no closure references.
 *
 * Bilibili editor uses ProseMirror (TipTap) inside an iframe (york/read-editor).
 */

export function bilibiliInject(title: string, body: string): Promise<string> {
  if ((window as any).__crosspost_injected__) return Promise.resolve('SKIP')
  ;(window as any).__crosspost_injected__ = true

  var TIMEOUT = 60000
  var INTERVAL = 200

  function log(msg: string) {
    console.log("[CrossPost:B站] " + msg)
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(function (r) {
      setTimeout(r, ms)
    })
  }

  function textToHTML(text: string): string {
    var paragraphs = text.split(/\n\s*\n/)
    var result = ""
    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i].trim()
      if (!p) continue
      var withBr = p.replace(/\n/g, "<br>")
      result += "<p>" + withBr + "</p>"
    }
    return result
  }

  function poll(
    checkFn: () => any,
    label: string
  ): Promise<any> {
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
        } catch (e) {
          /* retry */
        }
        setTimeout(tick, INTERVAL)
      }
      tick()
    })
  }

  // ====== MAIN ======

  log("v2 START title=" + (title ? title.length : 0) + " body=" + (body ? body.length : 0))

  // Step 1: Poll for the editor iframe
  return poll(function () {
    var allIframes = document.querySelectorAll("iframe")
    for (var i = 0; i < allIframes.length; i++) {
      var src = allIframes[i].getAttribute("src") || ""
      if (src.indexOf("york/read-editor") !== -1) {
        return allIframes[i] as HTMLIFrameElement
      }
    }
    return null
  }, "iframe[york/read-editor]")
    .then(function (iframe: HTMLIFrameElement) {
      // Step 2: Wait for iframe to load, then access its document
      return poll(function () {
        var doc =
          iframe.contentDocument ||
          (iframe.contentWindow && iframe.contentWindow.document)
        if (!doc) return null
        // Check if the editor is loaded
        var pm = doc.querySelector(".ProseMirror") as HTMLElement & {
          editor?: any
        }
        if (!pm || !pm.editor) return null
        return { doc: doc, pm: pm }
      }, "ProseMirror.editor").then(function (found: any) {
        var doc = found.doc
        var pm = found.pm
        log("ProseMirror.editor READY")

        // Fill title
        if (title) {
          var titleEl = doc.querySelector(
            'textarea[placeholder*="请输入标题"]'
          ) as HTMLTextAreaElement
          if (titleEl) {
            var desc = Object.getOwnPropertyDescriptor(
              HTMLTextAreaElement.prototype,
              "value"
            )
            if (desc && desc.set) {
              desc.set.call(titleEl, title)
              titleEl.dispatchEvent(new Event("input", { bubbles: true }))
              titleEl.dispatchEvent(new Event("change", { bubbles: true }))
              log("TITLE filled: " + title)
            }
          } else {
            log("TITLE element not found")
          }
        } else {
          log("TITLE skipped")
        }

        // Fill body
        if (body) {
          try {
            var html = textToHTML(body)
            pm.editor.chain().focus().setContent(html).run()
            log("BODY filled: " + body.length + " chars → " + html.length + " HTML")
          } catch (e: any) {
            log("BODY ERROR: " + (e.message || String(e)))
            return "ERR_BODY: " + (e.message || String(e))
          }
        } else {
          log("BODY skipped")
        }

        log("DONE")
        return "OK"
      })
    })
    .catch(function (err: any) {
      log("FATAL: " + (err && err.message ? err.message : String(err)))
      return "ERROR: " + (err && err.message ? err.message : String(err))
    })
}
