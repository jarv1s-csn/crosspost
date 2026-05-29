/**
 * Injection function for Bilibili article editor.
 *
 * Serialized by chrome.scripting.executeScript({ func, world: "MAIN" }).
 * MUST be self-contained — no async/await, no closure references, globals only.
 *
 * Bilibili editor uses ProseMirror (TipTap) inside an iframe.
 * We poll for the iframe, then poll for editor elements inside it.
 */

export function bilibiliInject(title: string, body: string): Promise<string> {
  const TIMEOUT = 15000
  const INTERVAL = 200

  function log(msg: string) {
    console.log("[CrossPost:B站] " + msg)
  }

  function textToHTML(text: string): string {
    // Split by double newlines into paragraphs
    const paragraphs = text.split(/\n\s*\n/)
    return paragraphs
      .map(function (p) {
        const trimmed = p.trim()
        if (!trimmed) return ""
        // Single newlines → <br>
        const withBr = trimmed.replace(/\n/g, "<br>")
        return "<p>" + withBr + "</p>"
      })
      .filter(Boolean)
      .join("")
  }

  function pollForElement(
    selector: string,
    root: Document | Element = document
  ): Promise<Element> {
    return new Promise(function (resolve, reject) {
      var start = performance.now()
      function check() {
        if (performance.now() - start >= TIMEOUT) {
          reject(
            new Error(
              '"' + selector + '" not found after ' + TIMEOUT + "ms"
            )
          )
          return
        }
        var el = root.querySelector(selector)
        if (el) {
          resolve(el)
          return
        }
        setTimeout(check, INTERVAL)
      }
      check()
    })
  }

  function fillNativeTextarea(
    el: HTMLTextAreaElement,
    value: string
  ): void {
    var desc = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    )
    if (desc && desc.set) {
      desc.set.call(el, value)
    }
    el.dispatchEvent(new Event("input", { bubbles: true }))
    el.dispatchEvent(new Event("change", { bubbles: true }))
  }

  function fillProseMirror(
    iframeDoc: Document,
    html: string
  ): string {
    var pmEl = iframeDoc.querySelector(".ProseMirror") as HTMLElement & {
      editor?: any
    }
    if (!pmEl) return "ERR_NO_PROSEMIRROR"
    if (!pmEl.editor || typeof pmEl.editor.chain !== "function") {
      return "ERR_NO_TIPTAP_EDITOR"
    }
    pmEl.editor.chain().focus().setContent(html).run()
    return "OK"
  }

  log(
    "START title=" +
      (title ? title.length : 0) +
      " body=" +
      (body ? body.length : 0)
  )

  // Step 1: Poll for the editor iframe
  return pollForElement('iframe[src*="york/read-editor"]')
    .then(function (iframe) {
      log("FOUND iframe")

      var iframeDoc =
        (iframe as HTMLIFrameElement).contentDocument ||
        (iframe as HTMLIFrameElement).contentWindow?.document

      if (!iframeDoc) {
        log("ERR_NO_IFRAME_DOC")
        return "ERR_NO_IFRAME_DOC"
      }

      var bodyHTML = body ? textToHTML(body) : ""
      log("HTML length: " + bodyHTML.length)

      // Step 2: Poll for editor body inside iframe
      return pollForElement(".ProseMirror", iframeDoc).then(function () {
        log("FOUND .ProseMirror")

        // Fill body
        if (bodyHTML) {
          try {
            var bodyResult = fillProseMirror(iframeDoc, bodyHTML)
            log("BODY: " + bodyResult)
          } catch (e: any) {
            log("BODY_ERROR: " + (e.message || String(e)))
          }
        } else {
          log("BODY: skipped")
        }

        // Fill title inside iframe
        if (title) {
          return pollForElement(
            'textarea[placeholder*="请输入标题"]',
            iframeDoc
          ).then(function (titleEl) {
            fillNativeTextarea(
              titleEl as HTMLTextAreaElement,
              title
            )
            log("TITLE: filled")
            log("DONE")
            return "OK"
          })
        } else {
          log("TITLE: skipped")
          log("DONE")
          return "OK"
        }
      })
    })
    .catch(function (err: any) {
      log("FATAL: " + (err && err.message ? err.message : String(err)))
      return "ERROR"
    })
}
