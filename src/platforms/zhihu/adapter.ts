import type { IPlatformAdapter } from "../interface"
import type { ContentInput, PlatformDraft, PreviewData, PlatformCredentials, PublishResult } from "../../types"
import { formatZhihuContent } from "./formatter"

export class ZhihuAdapter implements IPlatformAdapter {
  readonly displayName = "知乎"
  readonly key = "zhihu" as const
  readonly icon = "💡"

  formatContent(input: ContentInput): PlatformDraft {
    return formatZhihuContent(input)
  }

  renderPreview(draft: PlatformDraft): PreviewData {
    return {
      title: draft.title,
      body: draft.body,
      tags: draft.tags,
      metadata: {
        platform: "zhihu",
        style: "article",
        titleLimit: 30
      }
    }
  }

  async publish(
    _draft: PlatformDraft,
    _credentials: PlatformCredentials
  ): Promise<PublishResult> {
    throw new Error("知乎发布功能将在后续 PR 中实现（Content Script 注入）")
  }
}
