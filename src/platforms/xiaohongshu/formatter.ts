import type { ContentInput, PlatformDraft } from "../../types"

export function formatXiaohongshuContent(input: ContentInput): PlatformDraft {
  const truncatedTitle = input.title.length > 20
    ? input.title.slice(0, 17) + "..."
    : input.title

  return {
    platformKey: "xiaohongshu",
    title: truncatedTitle,
    body: input.body,
    tags: input.tags.slice(0, 5),
    metadata: {
      contentType: "note",
      maxTitleLength: 20,
      platform: "xiaohongshu",
    },
  }
}
