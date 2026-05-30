/**
 * Injection function for Zhihu article editor (Draft.js based).
 * Tested working approach: find React fiber → walk to component with onChange →
 * create new EditorState via Draft.js API → call onChange to trigger re-render.
 */
export function zhihuInject(title: string, body: string): void {
  const TIMEOUT = 60000
  const INTERVAL = 200

  async function pollForElement(selector: string): Promise<Element> {
    const start = performance.now()
    while (performance.now() - start < TIMEOUT) {
      const el = document.querySelector(selector)
      if (el) return el
      await new Promise((r) => setTimeout(r, INTERVAL))
    }
    throw new Error('Selector "' + selector + '" not found after ' + TIMEOUT + 'ms')
  }

  ;(async () => {
    try {
      const editorEl = await pollForElement('.public-DraftEditor-content')
      const el = editorEl as HTMLElement

      // Find React fiber key
      const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber'))
      if (!fiberKey) throw new Error('No React fiber found')

      // Walk up fiber tree to find component with props.onChange
      let fiber: any = (el as any)[fiberKey]
      let found = false

      while (fiber && !found) {
        const sn = fiber.stateNode
        if (sn && typeof sn.props === 'object' && typeof sn.props.onChange === 'function') {
          // Get current editor state
          const es = sn.props.editorState || (sn.state && sn.state.editorState)
          if (!es || typeof es.getCurrentContent !== 'function') {
            fiber = fiber.return
            continue
          }

          // Get constructors from prototype
          const EditorState = Object.getPrototypeOf(es).constructor
          const ContentState = es.getCurrentContent().constructor

          // Create new content: title on first line, blank line, then body
          const text = title ? title + '\n\n' + body : body
          const newContent = ContentState.createFromText(text)
          const newState = EditorState.push(es, newContent, 'insert-characters')

          // Trigger React re-render via onChange
          sn.props.onChange(newState)

          found = true
          console.log('[CrossPost] Editor filled via Draft.js API')
        }
        fiber = fiber.return
      }

      if (!found) throw new Error('Could not find Draft.js onChange handler')
    } catch (err: any) {
      console.error('[CrossPost] Injection failed:', err.message || err)
    }
  })()
}
