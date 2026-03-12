import { cachedFetchJson } from "./fetch-cache";
import { regionOf, ensureRegionsLoaded } from "./regions";

// An alternate form of a species, shown in the index when "All forms" is on.
// `suffix` is the form identifier used as the detail-page URL hash so the target
// page opens directly in that form (e.g. "mega-x", "galar").
export interface PokemonForm {
  id: number;
  name: string;
  suffix: string;
  types: string[];
  imageUrl: string;
  generation: string;
  kind: 'battle' | 'regional' | 'other';
}

export class Pokemon {
    public forms: PokemonForm[] = [];
    constructor(
      public id: number,
      public name: string,
      public codename: string,
      public imageUrl: string,
      public types: string[],
      public is_baby: boolean,
      public is_legendary: boolean,
      public is_mythical: boolean,
      public officialArtworkUrl: string,
      public generation: string
    ) {}

    get displayName() {
      return `${this.id}. ${this.name}`;
    }
  }
  
  export const loadPokemons = async (n: number) => {
    await ensureRegionsLoaded();
    const pokemons: Array<Pokemon> = [];

    // Map each version group to its generation (forms are introduced in a
    // specific version group, so a form's generation can differ from its
    // species' — e.g. Galarian Meowth is Gen VIII). Built once, up front.
    const vgToGen: { [vg: string]: string } = {};
    for (let g = 1; g <= 9; g++) {
      try {
        const genData = await cachedFetchJson(`https://pokeapi.co/api/v2/generation/${g}`);
        for (const vg of genData.version_groups) vgToGen[vg.name] = genData.name;
      } catch (e) { /* leave gaps; forms fall back to their species' generation */ }
    }

    for (let i = 1; i <= n; i++) {
        try {
            const data = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon/${i}`);
            const speciesData = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-species/${i}`);

            const imageUrl = data.sprites.front_default;
            const officialArtworkUrl = data.sprites.other["official-artwork"].front_default;
            const types = data.types.map((type: any) => type.type.name);
            const is_baby = speciesData.is_baby;
            const is_legendary = speciesData.is_legendary;
            const is_mythical = speciesData.is_mythical;
            const codename = data.species.name;
            const nameEntry = speciesData.names.find((entry: { language: { name: string } }) => entry.language.name === 'en');
            const name = nameEntry ? nameEntry.name : codename.charAt(0).toUpperCase() + codename.slice(1);
            const generation = speciesData.generation?.name || 'unknown';

            const pokemon = new Pokemon(i, name, codename, imageUrl, types, is_baby, is_legendary, is_mythical, officialArtworkUrl, generation);

            // Gather the species' alternate forms (with their own types) so the
            // index can list them when a "forms" toggle is on.
            const suffixOf = (formName: string, cn: string) =>
              formName.startsWith(cn + '-') ? formName.slice(cn.length + 1) : formName.split('-').slice(1).join('-');
            const titleCase = (s: string) => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            const varieties = (speciesData.varieties || []).filter((v: any) => !v.is_default);
            pokemon.forms = (await Promise.all(varieties.map(async (v: any) => {
              try {
                // The pokemon-form endpoint gives the form's own types, sprite and
                // version group (→ generation) in a single request.
                const fd = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-form/${v.pokemon.name}/`);
                const suffix = suffixOf(v.pokemon.name, codename);
                const vg = fd.version_group?.name;
                // A form is regional if its name contains a region token, else a
                // battle-only form, else a plain "other" form.
                const kind = fd.is_battle_only ? 'battle' : (regionOf(v.pokemon.name) !== 'default' ? 'regional' : 'other');
                return {
                  id: parseInt(v.pokemon.url.split('/').filter(Boolean).pop()),
                  name: `${name} (${titleCase(suffix)})`,
                  suffix,
                  types: fd.types.map((t: any) => t.type.name),
                  imageUrl: fd.sprites?.front_default || imageUrl,
                  generation: (vg && vgToGen[vg]) || generation,
                  kind,
                };
              } catch (e) {
                return null;
              }
            }))).filter(Boolean) as PokemonForm[];

            pokemons.push(pokemon);
        } catch (e) {
            console.error(`Error fetching data for Pokémon ID ${i}:`, e);
        }
    }
    return pokemons;
};
