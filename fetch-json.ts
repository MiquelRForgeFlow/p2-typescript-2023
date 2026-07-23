const RETRY_DELAYS_MS = [1000, 5000, 15000];

export async function fetchJson(url: string): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
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
