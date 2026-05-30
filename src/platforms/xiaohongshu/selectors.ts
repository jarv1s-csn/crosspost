/**
 * DOM selectors for Xiaohongshu creator platform.
 *
 * The creator platform is at creator.xiaohongshu.com.
 * Editor is a React-based SPA with:
 *   - Title: <input type="text">
 *   - Body: <div contenteditable="true"> — ClipboardEvent paste recommended
 *   - Publish: <button> "发布", has aria-disabled until ready
 *
 * Reference: MultiPost-Extension rednote.ts
 */
export const XHS_SELECTORS = {
  /** Upload image+text button on the note-manager page */
  UPLOAD_BUTTON: 'span[class="title"]',
  /** Title input */
  TITLE: 'input[type="text"]',
  /** Content editor (contenteditable div) */
  BODY: 'div[contenteditable="true"]',
  /** File input for image upload */
  FILE_INPUT: 'input[type="file"]',
  /** Publish button — text "发布" */
  PUBLISH_BUTTON: 'button',
} as const

export const POLL_INTERVAL = 200
export const POLL_TIMEOUT = 15000
