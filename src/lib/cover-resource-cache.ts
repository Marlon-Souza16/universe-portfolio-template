type Entry<T> = {users: number; value?: T; promise: Promise<T | null>};

/** Reference-counted LRU with bounded loading. A lease pins a resource until release. */
export class CoverResourceCache<T> {
  private entries = new Map<string, Entry<T>>();
  private queue: {priority: boolean; run: () => Promise<void>}[] = [];
  private running = 0;

  constructor(private limit: number, private dispose: (value: T) => void, private concurrency = 2) {}

  acquire(key: string, factory: () => Promise<T>, priority = false) {
    let entry = this.entries.get(key);
    if (!entry) {
      let resolve!: (value: T | null) => void;
      let reject!: (error: unknown) => void;
      entry = {users: 0, promise: new Promise<T | null>((yes, no) => {resolve = yes; reject = no;})};
      const current = entry;
      this.queue.push({priority, run: async () => {
        if (!current.users) {
          this.entries.delete(key);
          resolve(null);
          return;
        }
        try {
          current.value = await factory();
          resolve(current.value);
          this.trim();
        } catch (error) {
          this.entries.delete(key);
          reject(error);
        }
      }});
      this.entries.set(key, entry);
    } else {
      this.entries.delete(key);
      this.entries.set(key, entry);
    }
    entry.users += 1;
    this.pump();
    const claimed = entry;
    let released = false;
    return {promise: claimed.promise, release: () => {
      if (released) return;
      released = true;
      claimed.users -= 1;
      this.trim();
    }};
  }

  private pump() {
    this.queue.sort((a, b) => Number(b.priority) - Number(a.priority));
    while (this.running < this.concurrency && this.queue.length) {
      const job = this.queue.shift()!;
      this.running += 1;
      // Yield before resource creation; never run it inside an R3F frame callback.
      setTimeout(() => {void job.run().finally(() => {this.running -= 1; this.pump();});}, 0);
    }
  }

  private trim() {
    for (const [key, entry] of this.entries) {
      if (this.entries.size <= this.limit) break;
      if (entry.users || entry.value === undefined) continue;
      this.dispose(entry.value);
      this.entries.delete(key);
    }
  }
}
