/**
 * DOM selectors for Zhihu article editor.
 * Update these if Zhihu changes their editor structure.
 *
 * Verified 2026-05-29:
 *   - Title is a <TEXTAREA> with placeholder "请输入标题（最多 100 个字）"
 *   - Body is a Draft.js contenteditable .public-DraftEditor-content
 */
export const ZHIHU_SELECTORS = {
  /** Article title — standalone TEXTAREA (not part of Draft.js) */
  TITLE: 'textarea[placeholder*="请输入标题"]',
  /** Rich text editor body — Draft.js contenteditable container */
  BODY: '.public-DraftEditor-content',
  /** Fallback body selector if Draft.js one fails */
  BODY_FALLBACK: '[contenteditable="true"]',
  /** Publish/submit button */
  PUBLISH_BUTTON: 'button:has-text("发布")',
  /** Publish button fallback */
  PUBLISH_BUTTON_FALLBACK: '[class*="publish"]',
} as const

export const POLL_INTERVAL = 200 // ms
export const POLL_TIMEOUT = 15000 // 15s max wait
