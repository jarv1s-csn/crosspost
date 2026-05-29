import type { ContentInput, PlatformDraft, PlatformKey } from "../types"
import { buildZhihuPrompt } from "./prompts/zhihu"
import { buildBilibiliPrompt } from "./prompts/bilibili"
import { buildXiaohongshuPrompt } from "./prompts/xiaohongshu"

const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions"
const TIMEOUT_MS = 30_000
const MAX_RETRIES = 3

const PROMPT_BUILDERS: Record<
  PlatformKey,
  (input: ContentInput) => string
> = {
  zhihu: buildZhihuPrompt,
  bilibili: buildBilibiliPrompt,
  xiaohongshu: buildXiaohongshuPrompt
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function callDeepSeek(
  prompt: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch(DEEPSEEK_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "你是一个专业的内容创作助手。严格按 JSON 格式返回结果，不要添加额外说明或 markdown 代码块。"
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    }),
    signal
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error("DeepSeek API error " + response.status + ": " + text)
  }

  const data: DeepSeekResponse = await response.json()
  return data.choices[0].message.content
}

export async function transformToPlatform(
  platform: PlatformKey,
  input: ContentInput,
  apiKey: string
): Promise<PlatformDraft> {
  const builder = PROMPT_BUILDERS[platform]
  const prompt = builder(input)

  let lastError: Error | undefined

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const raw = await callDeepSeek(prompt, apiKey, controller.signal)
      clearTimeout(timeoutId)

      const parsed = JSON.parse(raw)

      return {
        platformKey: platform,
        title: parsed.title || input.title,
        body: parsed.body || input.body,
        tags: parsed.tags || [],
        metadata: {}
      }
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < MAX_RETRIES - 1) {
        const backoff = Math.pow(2, attempt) * 1000
        await sleep(backoff)
      }
    }
  }

  throw new Error(
    "Failed to transform content for " + platform + " after " + MAX_RETRIES + " attempts: " + (lastError?.message || "unknown")
  )
}

export async function transformAllPlatforms(
  input: ContentInput,
  apiKey: string,
  platforms: PlatformKey[] = ["zhihu", "bilibili", "xiaohongshu"]
): Promise<Partial<Record<PlatformKey, PlatformDraft>>> {
  const results: Partial<Record<PlatformKey, PlatformDraft>> = {}

  await Promise.all(
    platforms.map(async (platform) => {
      try {
        results[platform] = await transformToPlatform(platform, input, apiKey)
      } catch (err) {
        console.error("[CrossPost] Transform " + platform + " failed:", err)
      }
    })
  )

  return results
}
