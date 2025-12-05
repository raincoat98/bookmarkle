/**
 * Request Deduplication Utility
 * Prevents concurrent duplicate requests for the same resource
 */

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

class RequestDeduplicator {
  private pending = new Map<string, PendingRequest<any>>();
  private readonly TTL = 5000; // 5 seconds

  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Check for pending request
    const existing = this.pending.get(key);
    if (existing && Date.now() - existing.timestamp < this.TTL) {
      console.log(`🔄 Deduplicating request: ${key}`);
      return existing.promise;
    }

    // Create new request
    const promise = fetcher();
    this.pending.set(key, { promise, timestamp: Date.now() });

    // Clean up after completion
    promise.finally(() => {
      const current = this.pending.get(key);
      if (current?.promise === promise) {
        this.pending.delete(key);
      }
    });

    return promise;
  }
}

export const deduplicator = new RequestDeduplicator();
