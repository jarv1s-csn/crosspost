import type { ContentInput, PlatformDraft } from "../../types"

export function formatZhihuContent(input: ContentInput): PlatformDraft {
  const truncatedTitle = input.title.length > 30 ? input.title.slice(0, 27) + "..." : input.title

  return {
    platformKey: "zhihu",
    title: truncatedTitle,
    body: input.body,
    tags: input.tags.slice(0, 5),
    metadata: {
      contentType: "article",
      maxTitleLength: 30
    }
  }
}
