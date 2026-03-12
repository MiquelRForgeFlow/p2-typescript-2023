import { cachedFetchJson } from "./fetch-cache";

// The region tokens (kanto, johto, …, paldea) are pulled from the API so that
// new regions never have to be added by hand. A form is "regional" when its
// name contains one of these tokens as a hyphen segment (e.g.
// "meowth-galar" → galar). Other form differences that aren't regions
// (single-strike, midday, own-tempo…) share the default line.
export let REGION_TOKENS: string[] = [];

let regionsPromise: Promise<void> | null = null;

// Fetch the region list once; subsequent callers await the same promise.
// Safe to call from every entry point (loadPokemons, getEvolutionChain…).
export function ensureRegionsLoaded(): Promise<void> {
  if (!regionsPromise) {
    regionsPromise = (async () => {
      const list = await cachedFetchJson("https://pokeapi.co/api/v2/region/?limit=1000");
      REGION_TOKENS = list.results.map((r: any) => r.name);
    })().catch((e) => {
      // Let a later call retry instead of caching the failure.
      regionsPromise = null;
      throw e;
    });
  }
  return regionsPromise;
}

export function regionOf(formName: string): string {
  const parts = formName.split('-');
  // Ash's Pikachu "cap" forms (pikachu-hoenn-cap, pikachu-alola-cap…) are named
  // after regions but are NOT regional variants — they can't evolve or breed.
  // Exclude any "-cap" form so it stays on the default line.
  if (parts.includes('cap')) return 'default';
  for (const region of REGION_TOKENS) {
    if (parts.includes(region)) return region;
  }
  return 'default';
}
