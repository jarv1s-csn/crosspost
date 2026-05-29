import { platformRegistry } from "./registry"

// Platform adapters
import { ZhihuAdapter } from "./zhihu/adapter"
import { BilibiliAdapter } from "./bilibili/adapter"

platformRegistry.register(new ZhihuAdapter())
platformRegistry.register(new BilibiliAdapter())

// Future registrations:
// import { XiaohongshuAdapter } from "./xiaohongshu/adapter"
// platformRegistry.register(new XiaohongshuAdapter())

export { platformRegistry }
export type { IPlatformAdapter } from "./interface"
