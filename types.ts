import { cachedFetchJson } from "./fetch-cache";

// The list of battle types is pulled from the API too, so a new type would be
// picked up automatically. We drop the non-damage pseudo-types ("unknown",
// "stellar", "shadow") that never appear in a Pokémon's typing or in the
// effectiveness table.
const NON_BATTLE_TYPES = new Set(["unknown", "stellar", "shadow"]);

export let ALL_TYPES: string[] = [];

let typesPromise: Promise<void> | null = null;

export function ensureTypesLoaded(): Promise<void> {
  if (!typesPromise) {
    typesPromise = (async () => {
      const list = await cachedFetchJson("https://pokeapi.co/api/v2/type/?limit=1000");
      ALL_TYPES = list.results
        .map((t: any) => t.name)
        .filter((n: string) => !NON_BATTLE_TYPES.has(n));
    })().catch((e) => {
      typesPromise = null;
      throw e;
    });
  }
  return typesPromise;
}
