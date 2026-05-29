import { platformRegistry } from "./registry"

// Platform adapters will be registered in their respective PRs:
// import { ZhihuAdapter } from "./zhihu/adapter"
// platformRegistry.register(new ZhihuAdapter())
// ...

export { platformRegistry }
export type { IPlatformAdapter } from "./interface"
