// === Platform identifiers ===
export type PlatformKey = "xiaohongshu" | "bilibili" | "zhihu"

// === Original user input ===
export interface ContentInput {
  title: string
  body: string
  tags: string[]
  images: string[]
}

// === Platform-adapted draft ===
export interface PlatformDraft {
  platformKey: PlatformKey
  title: string
  body: string
  tags: string[]
  coverImage?: string
  metadata: Record<string, unknown>
}

// === Preview data (React-safe rendering) ===
export interface PreviewData {
  title: string
  body: string
  tags: string[]
  coverImage?: string
  metadata: Record<string, unknown>
}

// === Platform credentials (no cookie transport) ===
export interface PlatformCredentials {
  platform: PlatformKey
  userId?: string
  expiredAt?: number
}

// === Publish result (discriminated union) ===
export interface PublishSuccess {
  success: true
  platformPostId: string
  url: string
}

export interface PublishFailure {
  success: false
  error: string
}

export type PublishResult = PublishSuccess | PublishFailure

// === Publish status ===
export type PublishStatus = "idle" | "publishing" | "published" | "failed"

// === Publish record ===
export interface PublishRecord {
  id: string
  platform: PlatformKey
  status: PublishStatus
  result?: PublishResult
  createdAt: number
}

// === Persisted draft ===
export interface Draft {
  id: string
  original: ContentInput
  adapted: Partial<Record<PlatformKey, PlatformDraft>>
  records: PublishRecord[]
  createdAt: number
  updatedAt: number
}
