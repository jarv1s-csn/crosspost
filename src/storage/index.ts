const STORAGE_KEYS = {
  API_KEY: "crosspost_api_key",
  PROVIDER: "crosspost_provider",
  CUSTOM_ENDPOINT: "crosspost_custom_endpoint",
  CUSTOM_MODEL: "crosspost_custom_model",
  LAST_DRAFT: "crosspost_last_draft",
  LAST_RESULTS: "crosspost_last_results",
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

export async function saveProvider(provider: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.PROVIDER]: provider })
}

export async function loadProvider(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PROVIDER)
  return (result[STORAGE_KEYS.PROVIDER] as string) || "deepseek"
}

export async function saveCustomEndpoint(endpoint: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_ENDPOINT]: endpoint })
}

export async function loadCustomEndpoint(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_ENDPOINT)
  return (result[STORAGE_KEYS.CUSTOM_ENDPOINT] as string) || ""
}

export async function saveCustomModel(model: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_MODEL]: model })
}

export async function loadCustomModel(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_MODEL)
  return (result[STORAGE_KEYS.CUSTOM_MODEL] as string) || ""
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

export async function saveResults(data: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_RESULTS]: data })
}

export async function loadResults(): Promise<Record<string, unknown> | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_RESULTS)
  return (result[STORAGE_KEYS.LAST_RESULTS] as Record<string, unknown>) || null
}
