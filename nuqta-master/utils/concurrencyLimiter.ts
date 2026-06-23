// Concurrency Limiter
// Caps simultaneous in-flight fetch() calls to prevent OOM crashes
// on resource-constrained environments (BlueStacks, free-tier Render)

type Priority = 'high' | 'normal' | 'low';

interface QueueItem {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  priority: Priority;
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

class ConcurrencyLimiter {
  private maxConcurrent: number;
  private active = 0;
  private queue: QueueItem[] = [];

  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
  }

  async execute<T>(fn: () => Promise<T>, priority: Priority = 'normal'): Promise<T> {
    if (this.active < this.maxConcurrent) {
      return this.run(fn);
    }

    // Queue the request and wait for a slot
    return new Promise<T>((resolve, reject) => {
      const item: QueueItem = { fn, resolve, reject, priority };

      // Insert by priority: high items go to front, low to back
      if (priority === 'high') {
        // Insert before the first non-high item
        const idx = this.queue.findIndex(q => q.priority !== 'high');
        this.queue.splice(idx === -1 ? this.queue.length : idx, 0, item);
      } else if (priority === 'low') {
        this.queue.push(item);
      } else {
        // normal: insert before first low item
        const idx = this.queue.findIndex(q => q.priority === 'low');
        this.queue.splice(idx === -1 ? this.queue.length : idx, 0, item);
      }
    });
  }

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.dequeue();
    }
  }

  private dequeue(): void {
    if (this.queue.length === 0 || this.active >= this.maxConcurrent) return;

    const next = this.queue.shift()!;
    this.run(next.fn).then(next.resolve, next.reject);
  }
}

export const globalConcurrencyLimiter = new ConcurrencyLimiter(10);
