import type { IPlatformAdapter } from "./interface"
import type { PlatformKey } from "../types"

class PlatformRegistry {
  private adapters = new Map<PlatformKey, IPlatformAdapter>()

  register(adapter: IPlatformAdapter): void {
    if (this.adapters.has(adapter.key)) {
      throw new Error(
        `Platform "${adapter.key}" is already registered`
      )
    }
    this.adapters.set(adapter.key, adapter)
  }

  get(key: PlatformKey): IPlatformAdapter {
    const adapter = this.adapters.get(key)
    if (!adapter) {
      throw new Error(
        `Platform "${key}" is not registered. Available: ${[
          ...this.adapters.keys()
        ].join(", ")}`
      )
    }
    return adapter
  }

  list(): { key: PlatformKey; displayName: string; icon: string }[] {
    return [...this.adapters.values()].map((a) => ({
      key: a.key,
      displayName: a.displayName,
      icon: a.icon
    }))
  }

  getAll(): IPlatformAdapter[] {
    return [...this.adapters.values()]
  }
}

export const platformRegistry = new PlatformRegistry()
