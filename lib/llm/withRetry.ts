/** Backoff schedule for rate-limited calls, per ARCHITECTURE.md §6. */
const BACKOFF_MS = [1000, 2000, 4000, 8000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function statusOf(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    const e = err as { status?: unknown; statusCode?: unknown };
    if (typeof e.status === "number") return e.status;
    if (typeof e.statusCode === "number") return e.statusCode;
  }
  return undefined;
}

function isRetryable(err: unknown): boolean {
  const status = statusOf(err);
  if (status === 429) return true;
  if (status !== undefined && status >= 500) return true;

  // Gemini surfaces quota errors as RESOURCE_EXHAUSTED and transient capacity
  // problems as UNAVAILABLE; neither always carries a numeric status.
  const message = err instanceof Error ? err.message : String(err);
  return /\b429\b|RESOURCE_EXHAUSTED|UNAVAILABLE|rate.?limit|overloaded/i.test(
    message,
  );
}

/**
 * Retries a call on 429/5xx with exponential backoff (1s, 2s, 4s, 8s).
 * Non-retryable errors propagate immediately.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === BACKOFF_MS.length || !isRetryable(err)) throw err;
      await sleep(BACKOFF_MS[attempt]);
    }
  }

  throw lastError;
}

/**
 * Runs `fn` over `items` with at most `limit` in flight. Results keep input
 * order. A rejection propagates once the in-flight work settles.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

let pacerChain: Promise<void> = Promise.resolve();
let lastCallAt = 0;

/**
 * Enforces a minimum wall-clock gap between calls across the whole process.
 *
 * Gemini's free tier allows 10 requests per minute, i.e. one every 6s. Reactive
 * 429 backoff alone is not enough there: a batch fires its first calls
 * simultaneously, all get throttled, and the retries collide again. Spacing the
 * calls up front avoids the storm. A non-positive interval is a no-op, so
 * providers with headroom stay fully concurrent.
 */
export function pace(minIntervalMs: number): Promise<void> {
  if (minIntervalMs <= 0) return Promise.resolve();

  const next = pacerChain.then(async () => {
    const wait = lastCallAt + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
  });

  pacerChain = next.catch(() => undefined);
  return next;
}
