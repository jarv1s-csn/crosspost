/**
 * Injection function for Xiaohongshu "写长文" editor.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 *
 * Xiaohongshu long-form editor uses ProseMirror (TipTap):
 *   - Title: TEXTAREA.d-text placeholder="输入标题"
 *   - Body: DIV.tiptap.ProseMirror → pmEl.editor.chain().setContent()
 *   - Entry: click span "写长文" to open editor
 */

export function xiaohongshuInject(title: string, body: string): Promise<string> {
  var TIMEOUT = 30000
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

  // Step 1: Click "写长文" to enter the editor
  return poll(function () {
    var spans = document.querySelectorAll("span")
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i] as HTMLElement
      var t = s.textContent || ""
      if (t.indexOf("写长文") !== -1) return s
    }
    // Fallback: maybe already in editor
    var pm = document.querySelector(".ProseMirror")
    if (pm) return { alreadyOpen: true }
    return null
  }, "写长文 button")
    .then(function (found: any) {
      if (found.alreadyOpen) {
        log("Editor already open")
        return null
      }
      log("CLICK 写长文")
      found.click()
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(null) }, 3000)
      })
    })
    .then(function () {
      // Step 2: Poll for ProseMirror editor
      return poll(function () {
        var pm = document.querySelector(
          ".ProseMirror"
        ) as HTMLElement & { editor?: any }
        if (pm && pm.editor && typeof pm.editor.chain === "function") {
          return pm
        }
        return null
      }, "ProseMirror.editor")
    })
    .then(function (pm: any) {
      log("ProseMirror READY")

      var bodyHTML = body ? textToHTML(body) : ""

      // Fill body via TipTap API
      if (bodyHTML) {
        try {
          pm.editor.chain().focus().setContent(bodyHTML).run()
          log(
            "BODY filled: " +
              body.length +
              " chars → " +
              bodyHTML.length +
              " HTML"
          )
        } catch (e: any) {
          log("BODY ERROR: " + (e.message || String(e)))
        }
      } else {
        log("BODY skipped")
      }

      // Fill title — TEXTAREA.d-text placeholder="输入标题"
      if (title) {
        var titleEl = document.querySelector(
          'textarea.d-text, textarea[placeholder*="输入标题"], textarea[placeholder*="标题"]'
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
      } else {
        log("TITLE skipped")
      }

      log("DONE filling, now auto-publish...")
      return tryAutoPublish()
    })
    .catch(function (e: any) {
      log("FATAL: " + (e.message || String(e)))
      return "ERROR: " + (e.message || String(e))
    })
}

function tryAutoPublish(): Promise<string> {
  return new Promise(function (resolve) {
    setTimeout(function () {
      var publishStart = performance.now()
      function findPublish() {
        if (performance.now() - publishStart > 10000) {
          log("PUBLISH: timeout, manual publish required")
          resolve("OK (manual publish)")
          return
        }
        var buttons = document.querySelectorAll("button")
        for (var i = 0; i < buttons.length; i++) {
          var btn = buttons[i] as HTMLButtonElement
          var text = (btn.textContent || "").trim()
          if (
            text === "发布" &&
            btn.getAttribute("aria-disabled") !== "true" &&
            btn.offsetParent !== null
          ) {
            log("PUBLISH: click 发布")
            btn.click()
            resolve("OK (auto-published)")
            return
          }
        }
        setTimeout(findPublish, 1000)
      }
      setTimeout(findPublish, 2000)
    }, 1000)
  })
}
