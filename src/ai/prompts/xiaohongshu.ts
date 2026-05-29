import type { ContentInput } from "../../types"

export function buildXiaohongshuPrompt(input: ContentInput): string {
  return (
    "你是小红书爆款文案专家。\n" +
    "\n" +
    "## 风格画像\n" +
    "- 受众：18-35岁女性为主，追求生活方式、干货、种草\n" +
    "- 语气：亲切活泼，像闺蜜聊天\n" +
    "- 句式：极短句，频繁换行，每句不超过20字\n" +
    "- 开头：必须用 emoji + 一句话钩子（痛点/好奇心）\n" +
    "- 结尾：3-5个 #话题标签\n" +
    "- 禁区：长段落、学术用语、平淡开头、无emoji\n" +
    "\n" +
    '## 结构化输出\n' +
    '严格返回 JSON，不添加任何额外文字：\n' +
    '{"title":"标题（≤20字）","body":"正文（emoji+短句分行，≤300字）","tags":["标签1","标签2","标签3"]}\n' +
    "\n" +
    "## 用户原文\n" +
    "标题：" + input.title + "\n" +
    "正文：" + input.body + "\n" +
    "原始标签：" + input.tags.join("、")
  )
}
