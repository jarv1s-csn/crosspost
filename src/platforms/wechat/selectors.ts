/**
 * DOM selectors for WeChat Official Account (公众号) article editor.
 * Update these if WeChat changes their editor structure.
 *
 * Verified selectors for mp.weixin.qq.com/cgi-bin/appmsg editor:
 *   - Title: <INPUT id="title"> with placeholder "请在这里输入标题"
 *   - Body (old editor): UEditor iframe #ueditor_0 — iframe body is contenteditable
 *   - Body (new editor): div[contenteditable="true"] directly on page
 */
export const WECHAT_SELECTORS = {
  /** Article title — plain <INPUT id="title"> on the main page */
  TITLE: '#title',
  /** Title fallback selectors if #title is absent */
  TITLE_FALLBACK_INPUT: 'input[placeholder*="标题"]',
  TITLE_FALLBACK_TEXTAREA: 'textarea[placeholder*="标题"]',
  /** UEditor iframe (older editor) */
  BODY_UEDITOR_IFRAME: '#ueditor_0',
  /** UEditor iframe fallback */
  BODY_UEDITOR_IFRAME_FALLBACK: 'iframe[id*="ueditor"]',
  /** Direct contenteditable body (newer editor) */
  BODY_CONTENTEDITABLE: '[contenteditable="true"]',
} as const

export const POLL_INTERVAL = 200 // ms
export const POLL_TIMEOUT = 15000 // 15s max wait
