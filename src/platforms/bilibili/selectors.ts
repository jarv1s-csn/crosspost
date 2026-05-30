/**
 * DOM selectors for Bilibili article editor.
 *
 * Editor is inside an iframe (src contains "york/read-editor") on the
 * member.bilibili.com domain. Both main page and iframe are same-origin,
 * so MAIN-world injected scripts can access iframe.contentDocument.
 *
 * Verified 2026-05-29:
 *   - Title is a <TEXTAREA.title-input__inner> with placeholder "请输入标题（建议30字以内）"
 *   - Body is a ProseMirror (TipTap) contenteditable <DIV.ProseMirror>
 *   - Editor instance is accessible via pmEl.editor (TipTap)
 *   - Publish button: <BUTTON> "发布"
 */
export const BILIBILI_SELECTORS = {
  /** Article editor iframe */
  IFRAME: 'iframe[src*="york/read-editor"]',
  /** Article title — TEXTAREA inside iframe */
  TITLE: 'textarea[placeholder*="请输入标题"]',
  /** Rich text editor body — ProseMirror (TipTap) contenteditable inside iframe */
  BODY: '.ProseMirror',
  /** Publish/submit button inside iframe */
  PUBLISH_BUTTON: 'button:has-text("发布")',
  /** Save draft button */
  DRAFT_BUTTON: 'button:has-text("保存为草稿")',
  /** Add topic/tags button */
  TOPIC_BUTTON: 'button:has-text("添加话题")',
} as const

export const POLL_INTERVAL = 200 // ms
export const POLL_TIMEOUT = 15000 // 15s max wait
