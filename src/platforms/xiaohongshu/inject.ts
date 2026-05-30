/**
 * Injection function for Xiaohongshu creator platform.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 * MUST be self-contained — no async/await.
 *
 * Xiaohongshu creator editor is React-controlled contenteditable.
 * We use ClipboardEvent('paste') to set content — innerHTML won't work.
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

  // Step 1: Click "上传图文" to enter editor
  return poll(function () {
    var spans = document.querySelectorAll('span')
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i] as HTMLElement
      if (s.textContent && s.textContent.indexOf("上传图文") !== -1) {
        return s
      }
    }
    // If "上传图文" not found, check if editor is already open
    var titleInput = document.querySelector('input[type="text"]')
    if (titleInput) return { alreadyOpen: true }
    return null
  }, "upload button")
    .then(function (found: any) {
      if (!found.alreadyOpen) {
        log("CLICK 上传图文")
        found.click()
        // Wait for editor to open
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(null) }, 2000)
        })
      }
      log("Editor already open")
      return null
    })
    .then(function () {
      var promises: Promise<any>[] = []

      // Fill title
      if (title) {
        promises.push(
          poll(function () {
            var inputs = document.querySelectorAll('input[type="text"]')
            for (var i = 0; i < inputs.length; i++) {
              var inp = inputs[i] as HTMLInputElement
              var ph = inp.getAttribute("placeholder") || ""
              // Title input has placeholder about title
              if (ph.indexOf("标题") !== -1 || ph.indexOf("title") !== -1 || inp.id === "title") {
                return inp
              }
            }
            // Fallback: first visible text input
            for (var j = 0; j < inputs.length; j++) {
              var ij = inputs[j] as HTMLInputElement
              if (ij.offsetParent !== null) return ij
            }
            return null
          }, "title input").then(function (el: HTMLInputElement) {
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
          }).catch(function (e: any) {
            log("TITLE ERROR: " + (e.message || String(e)))
          })
        )
      }

      // Fill body via ClipboardEvent (React-controlled contenteditable)
      if (body) {
        promises.push(
          poll(function () {
            var editables = document.querySelectorAll('[contenteditable="true"]')
            for (var i = 0; i < editables.length; i++) {
              var ed = editables[i] as HTMLElement
              // Skip small/hidden editables
              if (ed.offsetParent === null) continue
              if (ed.tagName === "DIV" || ed.tagName === "SECTION") {
                return ed
              }
            }
            return null
          }, "contenteditable").then(function (contentEl: HTMLElement) {
            contentEl.focus()
            // Build content with tags
            var fullText = body
            var pasteEvent = new ClipboardEvent("paste", {
              bubbles: true,
              cancelable: true,
              clipboardData: new DataTransfer(),
            })
            pasteEvent.clipboardData.setData("text/plain", fullText)
            contentEl.dispatchEvent(pasteEvent)
            log("BODY pasted: " + body.length + " chars")
            // Blur to trigger React state update
            setTimeout(function () {
              contentEl.blur()
            }, 500)
          }).catch(function (e: any) {
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
      // Poll for publish button (wait for it to be enabled)
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
          if (text === "发布" && btn.getAttribute("aria-disabled") !== "true") {
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
