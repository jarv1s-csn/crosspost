/**
 * Injection function for Xiaohongshu creator platform.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 *
 * Xiaohongshu creator editor is React-controlled contenteditable.
 * We use ClipboardEvent('paste') to set content.
 *
 * Reference: MultiPost-Extension src/sync/dynamic/rednote.ts
 */

export function xiaohongshuInject(title: string, body: string): Promise<string> {
  var TIMEOUT = 15000
  var INTERVAL = 200

  function log(msg: string) {
    console.log("[CrossPost:小红书] " + msg)
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

  // Step 1: Force click "上传图文" button
  return poll(function () {
    var spans = document.querySelectorAll("span")
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i] as HTMLElement
      var t = s.textContent || ""
      if (t.indexOf("上传图文") !== -1) {
        return s
      }
    }
    return null
  }, "upload button")
    .then(function (btn: HTMLElement) {
      log("CLICK 上传图文")
      btn.click()
      // Wait for editor to open (React SPA transition)
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(null)
        }, 2500)
      })
    })
    .then(function () {
      var promises: Promise<any>[] = []

      // Fill title — only inputs with placeholder "标题"
      if (title) {
        promises.push(
          poll(function () {
            var inputs = document.querySelectorAll(
              'input[type="text"], textarea'
            )
            for (var i = 0; i < inputs.length; i++) {
              var inp = inputs[i] as HTMLInputElement
              var ph = (inp.getAttribute("placeholder") || "").toLowerCase()
              var id = (inp.id || "").toLowerCase()
              if (
                ph.indexOf("标题") !== -1 ||
                ph.indexOf("title") !== -1 ||
                id === "title"
              ) {
                return inp
              }
            }
            return null
          }, "title input")
            .then(function (el: HTMLInputElement) {
              var desc = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value"
              )
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
        )
      }

      // Fill body via ClipboardEvent
      if (body) {
        promises.push(
          poll(function () {
            var editables = document.querySelectorAll(
              '[contenteditable="true"]'
            )
            for (var i = 0; i < editables.length; i++) {
              var ed = editables[i] as HTMLElement
              // Must be visible and a block element
              if (ed.offsetParent === null) continue
              var tag = ed.tagName
              if (tag === "DIV" || tag === "SECTION" || tag === "P") {
                return ed
              }
            }
            return null
          }, "contenteditable")
            .then(function (contentEl: HTMLElement) {
              contentEl.focus()
              var pasteEvent = new ClipboardEvent("paste", {
                bubbles: true,
                cancelable: true,
                clipboardData: new DataTransfer(),
              })
              pasteEvent.clipboardData.setData("text/plain", body)
              contentEl.dispatchEvent(pasteEvent)
              log("BODY pasted: " + body.length + " chars")
              setTimeout(function () {
                contentEl.blur()
              }, 500)
            })
            .catch(function (e: any) {
              log("BODY ERROR: " + (e.message || String(e)))
            })
        )
      }

      return Promise.all(promises)
    })
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
