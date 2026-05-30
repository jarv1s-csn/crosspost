import { platformRegistry } from "./registry"

// Platform adapters
import { ZhihuAdapter } from "./zhihu/adapter"
import { BilibiliAdapter } from "./bilibili/adapter"
import { WechatAdapter } from "./wechat/adapter"
import { XiaohongshuAdapter } from "./xiaohongshu/adapter"

platformRegistry.register(new ZhihuAdapter())
platformRegistry.register(new BilibiliAdapter())
platformRegistry.register(new WechatAdapter())
platformRegistry.register(new XiaohongshuAdapter())

// All platforms registered

export { platformRegistry }
export type { IPlatformAdapter } from "./interface"
