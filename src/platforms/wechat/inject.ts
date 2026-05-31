/**
 * Injection function for WeChat Official Account editor.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 *
 * Editor URL: /cgi-bin/appmsg?t=media/appmsg_edit_v2&...
 * The editor migrated from UEditor to ProseMirror.
 * Official JS API: window.__MP_Editor_JSAPI__.invoke()
 *
 * API: mp_editor_set_content — set body HTML
 *      mp_editor_get_isready — check if editor is loaded
 */

export function wechatInject(title: string, body: string): Promise<string> {
  if ((window as any).__crosspost_injected__) return Promise.resolve('SKIP')
  ;(window as any).__crosspost_injected__ = true

  var TIMEOUT = 60000
  var INTERVAL = 200

  function log(msg: string) {
    console.log("[CrossPost:公众号] " + msg)
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

  // Fill title — #title input
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
          el.focus()
          if (desc && desc.set) {
            desc.set.call(el, title)
          } else {
            el.value = title
          }
          el.dispatchEvent(new Event("input", { bubbles: true }))
          el.dispatchEvent(new Event("change", { bubbles: true }))
          el.dispatchEvent(new Event("compositionend", { bubbles: true }))
          el.blur()
          log("TITLE filled: " + title.length + " chars")
        })
        .catch(function (e: any) {
          log("TITLE ERROR: " + (e.message || String(e)))
        })
    : Promise.resolve()

  // Fill body via official MP_Editor_JSAPI
  // Correct invoke signature: { apiName, apiParam: { content }, sucCb, errCb }
  // Poll for mp_editor_get_isready isNew=true, but with 5s deadline fallback
  var GET_READY_DEADLINE = 5000
  var bodyPromise: Promise<void> = body
    ? poll(function () {
        var w = window as any
        if (w.__MP_Editor_JSAPI__ && typeof w.__MP_Editor_JSAPI__.invoke === "function") {
          return w.__MP_Editor_JSAPI__
        }
        return null
      }, "__MP_Editor_JSAPI__")
        .then(function (jsapi: any) {
          var html = textToHTML(body)
          return new Promise<void>(function (resolve, reject) {
            var start = performance.now()
            var forced = false
            function doSetContent() {
              jsapi.invoke({
                apiName: "mp_editor_set_content",
                apiParam: { content: html },
                sucCb: function () {
                  log("BODY filled via JSAPI: " + body.length + " chars → " + html.length + " HTML" + (forced ? " (forced after deadline)" : ""))
                  resolve()
                },
                errCb: function (err: any) {
                  log("BODY set_content errCb: " + JSON.stringify(err))
                  reject(new Error("mp_editor_set_content failed: " + JSON.stringify(err)))
                },
              })
            }
            function trySet() {
              if (performance.now() - start >= TIMEOUT) {
                reject(new Error("mp_editor_set_content TIMEOUT"))
                return
              }
              // 5s deadline: skip isNew check, call set_content directly
              if (!forced && performance.now() - start >= GET_READY_DEADLINE) {
                forced = true
                log("EDITOR get_isready deadline exceeded, forcing set_content")
                doSetContent()
                return
              }
              jsapi.invoke({
                apiName: "mp_editor_get_isready",
                sucCb: function (res: any) {
                  if (!res || !res.isNew) {
                    log("EDITOR not isNew yet (isNew=" + (res && res.isNew) + "), retrying...")
                    setTimeout(trySet, INTERVAL)
                    return
                  }
                  doSetContent()
                },
                errCb: function (err: any) {
                  log("mp_editor_get_isready errCb: " + JSON.stringify(err))
                  setTimeout(trySet, INTERVAL)
                },
              })
            }
            trySet()
          })
        })
        .catch(function (e: any) {
          log("BODY ERROR: " + (e.message || String(e)))
        })
    : Promise.resolve()

  return Promise.all([titlePromise, bodyPromise])
    .then(function () {
      log("DONE")
      return "OK"
    })
    .catch(function (e: any) {
      log("FATAL: " + (e.message || String(e)))
      return "ERROR"
    })
}
