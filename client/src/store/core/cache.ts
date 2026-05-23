type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  staleAt: number;
  version: number;
};

export class MemoryCache {
  private cache: Record<string, CacheEntry<unknown>> = {};

  get<T>(key: string): T | null {
    const entry = this.cache[key] as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (entry.expiresAt < now) {
      delete this.cache[key];
      return null;
    }

    return entry.value;
  }

  set<T>(key: string, value: T, ttl = 1000 * 60): void {
    const now = Date.now();
    this.cache[key] = {
      value,
      expiresAt: now + ttl,
      staleAt: now + Math.floor(ttl / 2),
      version: Date.now(),
    };
  }

  invalidate(key: string): void {
    delete this.cache[key];
  }

  staleWhileRevalidate<T>(key: string, loader: () => Promise<T>, ttl = 1000 * 60): Promise<T> {
    const existing = this.cache[key] as CacheEntry<T> | undefined;
    const now = Date.now();

    if (existing && existing.staleAt >= now) {
      return Promise.resolve(existing.value);
    }

    const fallback = existing ? existing.value : null;
    loader()
      .then(result => this.set(key, result, ttl))
      .catch(() => {
        if (!existing) {
          this.invalidate(key);
        }
      });

    return Promise.resolve(fallback as T);
  }
}
