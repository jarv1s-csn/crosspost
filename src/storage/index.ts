const STORAGE_KEYS = {
  API_KEY: "crosspost_api_key",
  LAST_DRAFT: "crosspost_last_draft",
  PUBLISH_HISTORY: "crosspost_publish_history",
} as const

export interface StoredDraft {
  title: string
  body: string
  tags: string
  updatedAt: number
}

export async function saveApiKey(key: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.API_KEY]: key })
}

export async function loadApiKey(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY)
  return (result[STORAGE_KEYS.API_KEY] as string) || ""
}

export async function saveDraft(draft: StoredDraft): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.LAST_DRAFT]: { ...draft, updatedAt: Date.now() }
  })
}

export async function loadDraft(): Promise<StoredDraft | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_DRAFT)
  return (result[STORAGE_KEYS.LAST_DRAFT] as StoredDraft) || null
}

export async function clearDraft(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.LAST_DRAFT)
}
