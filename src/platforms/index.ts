import { platformRegistry } from "./registry"

// Platform adapters
import { ZhihuAdapter } from "./zhihu/adapter"

platformRegistry.register(new ZhihuAdapter())

// Future registrations:
// import { BilibiliAdapter } from "./bilibili/adapter"
// platformRegistry.register(new BilibiliAdapter())
// import { XiaohongshuAdapter } from "./xiaohongshu/adapter"
// platformRegistry.register(new XiaohongshuAdapter())

export { platformRegistry }
export type { IPlatformAdapter } from "./interface"
