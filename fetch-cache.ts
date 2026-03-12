import { createHash } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";

// PokeAPI data rarely changes, so cache every generator-side request:
//  - in memory, to dedup within a run (the same type/ability/generation URLs
//    are hit thousands of times);
//  - on disk under .cache/api (gitignored), so re-runs skip the network almost
//    entirely.
// Disk entries expire after CACHE_TTL_MS so occasional upstream changes (a form
// becoming battle-only, a new evolution) are picked up without manually wiping
// the cache. Override with the CACHE_TTL_MS env var: 0 forces a fresh fetch
// every run; a large value keeps the old "cache forever" behaviour. Deleting
// the .cache folder still forces a full refresh.
const CACHE_DIR = ".cache/api";
const RETRY_DELAYS_MS = [1000, 5000, 15000];
const envTtl = Number((globalThis as any).process?.env?.CACHE_TTL_MS);
const CACHE_TTL_MS = Number.isFinite(envTtl) ? envTtl : 24 * 60 * 60 * 1000; // 24h
const inFlight = new Map<string, Promise<any>>();
let dirReady: Promise<unknown> | null = null;

function cachePath(url: string): string {
  return `${CACHE_DIR}/${createHash("md5").update(url).digest("hex")}.json`;
}

// Fetch JSON with a check on the response status and retries with backoff, so
// a transient PokeAPI error (rate limit, 5xx, an HTML error page) doesn't abort
// the run with an "Unexpected token '<'".
async function fetchJsonWithRetry(url: string): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        throw new Error(`Failed to fetch ${url} after ${RETRY_DELAYS_MS.length + 1} attempts: ${error}`);
      }
      const delay = RETRY_DELAYS_MS[attempt];
      console.warn(`Fetch failed for ${url} (${error}), retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export function cachedFetchJson(url: string): Promise<any> {
  const existing = inFlight.get(url);
  if (existing) return existing;

  const promise = (async () => {
    const path = cachePath(url);
    if (CACHE_TTL_MS > 0) {
      try {
        const { mtimeMs } = await stat(path);
        // Only serve the cached copy while it's still within the TTL; a stale
        // entry falls through and is re-fetched (and overwritten) below.
        if (Date.now() - mtimeMs < CACHE_TTL_MS) {
          return JSON.parse(await readFile(path, "utf8"));
        }
      } catch (e) {
        // cache miss (or unreadable) → go to the network
      }
    }

    const data = await fetchJsonWithRetry(url);

    if (!dirReady) dirReady = mkdir(CACHE_DIR, { recursive: true });
    await dirReady;
    await writeFile(path, JSON.stringify(data));
    return data;
  })();

  inFlight.set(url, promise);
  // On failure, forget it so a later call can try again instead of resolving
  // to the cached rejection.
  promise.catch(() => inFlight.delete(url));
  return promise;
}
