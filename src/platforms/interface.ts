import type {
  ContentInput,
  PlatformDraft,
  PreviewData,
  PlatformCredentials,
  PublishResult,
  PlatformKey
} from "../types"

export interface IPlatformAdapter {
  /** Display name in Chinese */
  readonly displayName: string
  /** Platform identifier */
  readonly key: PlatformKey
  /** Platform icon (emoji) */
  readonly icon: string

  /** Format adaptation — pure function, no side effects */
  formatContent(input: ContentInput): PlatformDraft

  /** Preview data — returns structured data for React safe rendering */
  renderPreview(draft: PlatformDraft): PreviewData

  /**
   * Publish — called in Content Script context.
   * Relies on browser login state (cookies), no credential transport.
   * Fills content into target platform editor and triggers publish.
   */
  publish(
    draft: PlatformDraft,
    credentials: PlatformCredentials
  ): Promise<PublishResult>
}
