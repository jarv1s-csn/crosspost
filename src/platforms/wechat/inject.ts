/**
 * Injection function for WeChat Official Account (公众号) article editor.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 * MUST be self-contained — no async/await, no closure references.
 *
 * The 公众号 editor at mp.weixin.qq.com supports two layouts:
 *   1. Older editor: UEditor iframe (#ueditor_0), window.UE global API available
 *   2. Newer editor: direct contenteditable div on the main page
 *
 * Title is always a plain <input id="title"> on the main page.
 */
export function wechatInject(title: string, body: string): Promise<string> {
  var TIMEOUT = 60000
  var INTERVAL = 200

  function log(msg: string) {
    console.log("[CrossPost:公众号] " + msg)
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
        } catch (e) {
          /* retry */
        }
        setTimeout(tick, INTERVAL)
      }
      tick()
    })
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

  log("START title=" + (title ? title.length : 0) + " body=" + (body ? body.length : 0))

  // ====== TITLE ======
  var titlePromise: Promise<void> = title
    ? poll(function () {
        return (
          document.querySelector("#title") ||
          document.querySelector('input[placeholder*="标题"]') ||
          document.querySelector('textarea[placeholder*="标题"]')
        )
      }, "#title")
        .then(function (el: any) {
          var isTextarea = el.tagName === "TEXTAREA"
          var proto = isTextarea
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype
          var desc = Object.getOwnPropertyDescriptor(proto, "value")
          if (desc && desc.set) {
            desc.set.call(el, title)
          } else {
            el.value = title
          }
          el.dispatchEvent(new Event("input", { bubbles: true }))
          el.dispatchEvent(new Event("change", { bubbles: true }))
          log("TITLE filled: " + title.length + " chars")
        })
        .catch(function (e: any) {
          log("TITLE ERROR: " + (e.message || String(e)))
        })
    : Promise.resolve()

  // ====== BODY ======
  var bodyPromise: Promise<void> = body
    ? poll(function () {
        var w = window as any

        // Strategy 1: UEditor global API (window.UE)
        if (w.UE && typeof w.UE.getEditor === "function") {
          try {
            var ue = w.UE.getEditor("ueditor_0")
            if (ue && typeof ue.setContent === "function") {
              return { type: "ue_api", ue: ue }
            }
          } catch (e) {
            /* fall through */
          }
        }

        // Strategy 2: UEditor iframe (#ueditor_0)
        var ueditorIframe = (document.querySelector("#ueditor_0") ||
          document.querySelector(
            'iframe[id*="ueditor"]'
          )) as HTMLIFrameElement | null
        if (ueditorIframe) {
          var iframeDoc =
            ueditorIframe.contentDocument ||
            (ueditorIframe.contentWindow &&
              ueditorIframe.contentWindow.document)
          if (iframeDoc && iframeDoc.body) {
            return { type: "ue_iframe", doc: iframeDoc, el: iframeDoc.body }
          }
          return null // iframe found but not ready
        }

        // Strategy 3: Direct contenteditable div (newer editor)
        var editables = document.querySelectorAll('[contenteditable="true"]')
        for (var i = 0; i < editables.length; i++) {
          var candidate = editables[i] as HTMLElement
          if (candidate.id === "title") continue
          var ph = candidate.getAttribute("placeholder") || ""
          if (ph.indexOf("标题") !== -1) continue
          if (candidate.tagName === "DIV" || candidate.tagName === "SECTION") {
            return { type: "contenteditable", el: candidate }
          }
        }
        return null
      }, "body editor")
        .then(function (found: any) {
          var html = textToHTML(body)

          if (found.type === "ue_api") {
            try {
              found.ue.setContent(html)
              log("BODY filled via UE API: " + body.length + " chars")
            } catch (e: any) {
              log("BODY UE_API ERROR: " + (e.message || String(e)))
            }
            return
          }

          // ue_iframe or contenteditable — set innerHTML + events
          var el = found.el as HTMLElement
          var targetDoc: Document =
            found.type === "ue_iframe" ? found.doc : document
          try {
            el.focus()
            var inserted = false
            if (typeof targetDoc.execCommand === "function") {
              targetDoc.execCommand("selectAll", false, null)
              inserted = targetDoc.execCommand("insertHTML", false, html)
            }
            if (!inserted) {
              el.innerHTML = html
              el.dispatchEvent(new Event("input", { bubbles: true }))
              el.dispatchEvent(new Event("change", { bubbles: true }))
            }
            log(
              "BODY filled (" +
                found.type +
                "): " +
                body.length +
                " chars → " +
                html.length +
                " HTML"
            )
          } catch (e: any) {
            log("BODY ERROR: " + (e.message || String(e)))
          }
        })
        .catch(function (e: any) {
          log("BODY FATAL: " + (e.message || String(e)))
        })
    : Promise.resolve()

  return Promise.all([titlePromise, bodyPromise])
    .then(function () {
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
      var publishSelectors = [
        '#js_send',
        '#publishBtn',
        '#publish',
        '.weui-desktop-btn_primary',
        '[data-id="publish"]',
      ]

      // Try CSS selectors first
      var clicked = false
      for (var i = 0; i < publishSelectors.length; i++) {
        try {
          var btn = document.querySelector(publishSelectors[i]) as HTMLElement
          if (btn && !clicked) {
            log("CLICK publish via: " + publishSelectors[i])
            btn.click()
            clicked = true
            break
          }
        } catch (e) { /* try next */ }
      }

      // Fallback: scan all buttons for publish text
      if (!clicked) {
        var allBtns = document.querySelectorAll('button, a.btn, span.btn')
        for (var k = 0; k < allBtns.length; k++) {
          var b = allBtns[k] as HTMLElement
          var t = (b.textContent || '').trim()
          if (t === '发布' || t === '群发' || t === '保存并群发' || t === '发表') {
            log("CLICK publish button: " + t)
            b.click()
            clicked = true
            break
          }
        }
      }

      if (!clicked) {
        log("PUBLISH: no button found, manual publish required")
        resolve("OK (manual publish)")
        return
      }

      // Poll for confirmation dialog
      var confirmStart = performance.now()
      function checkConfirm() {
        if (performance.now() - confirmStart > 5000) {
          log("PUBLISH: confirmation not found, assume done")
          resolve("OK (publish clicked)")
          return
        }
        var confirmBtns = document.querySelectorAll('button, a.btn')
        for (var j = 0; j < confirmBtns.length; j++) {
          var text = (confirmBtns[j].textContent || '').trim()
          if (text === '确定' || text === '发布' || text === '群发' || text === '确认发布') {
            log("PUBLISH: click confirm: " + text)
            ;(confirmBtns[j] as HTMLElement).click()
            resolve("OK (auto-published)")
            return
          }
        }
        setTimeout(checkConfirm, 500)
      }
      setTimeout(checkConfirm, 1500)
    }, 1000)
  })
}
