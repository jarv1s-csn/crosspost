import type { ContentInput, PlatformDraft } from "../../types"

export function formatWechatContent(input: ContentInput): PlatformDraft {
  const truncatedTitle = input.title.length > 64
    ? input.title.slice(0, 61) + "..."
    : input.title

  return {
    platformKey: "wechat",
    title: truncatedTitle,
    body: input.body,
    tags: input.tags.slice(0, 5),
    metadata: {
      contentType: "article",
      maxTitleLength: 64,
      platform: "wechat",
    },
  }
}
