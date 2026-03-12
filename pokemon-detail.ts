import { cachedFetchJson } from "./fetch-cache";
import { regionOf, ensureRegionsLoaded } from "./regions";

interface DamageRelation {
  double_damage_from: { name: string }[];
  half_damage_from: { name: string }[];
  no_damage_from: { name: string }[];
}

interface Ability {
  name: string;
  description: string;
  is_hidden: boolean;
}

interface Stat {
  name: string;
  value: number;
}

interface DexDescription {
  version: string;
  flavor_text: string;
}

// The evolution chain is stored as a raw tree annotated per region, so the page
// can render a different chain depending on which form is being viewed (e.g.
// Galarian Slowpoke evolves into Galarian Slowbro/Slowking, Kanto into the
// regular ones). Each node carries its regional variants; each edge records,
// per region, the trigger text (its presence means that edge applies to that
// region).
interface EvoFormVariant {
  id: number;
  formName: string;
  name: string;
  imageUrl: string;
  region: string;
  // A persistent sibling this form transforms to/from (Minior meteor ↔ core):
  // still a selectable variety, but the chain draws a "↔" to its counterpart.
  transform?: { id: number; formName: string; name: string; imageUrl: string; trigger: string };
}

// A battle-only form (Mega, Gmax, ability transforms…): a transient
// transformation shown in the chain with a "↔" instead of in the Forms list.
// baseForms lists the sibling form(s) it can transform from (may be several,
// e.g. Zygarde Complete from both 10%/50% Power Construct).
interface EvoBattleForm {
  id: number;
  formName: string;
  name: string;
  imageUrl: string;
  trigger: string;
  baseForms: string[];
}

interface EvoNode {
  speciesId: number;
  codename: string;
  defaultFormName: string;
  variants: EvoFormVariant[];   // non-battle-only varieties (default + regional + cosmetic)
  allFormNames: string[];       // every variety name (for the "+" badge)
  battleForms: EvoBattleForm[];
  children: EvoEdge[];
}

// Each evolution path keeps the raw base/evolved form names so the renderer can
// thread a form-specific chain by matching both ends (needed when a line
// diverges via the evolved form, e.g. Mime Jr. → Galarian Mr. Mime → Mr. Rime).
interface EvoPath {
  baseForm: string | null;
  evolvedForm: string | null;
  trigger: string;
}

interface EvoEdge {
  node: EvoNode;
  paths: EvoPath[];
}

interface Variety {
  name: string;
  url: string;
  is_default: boolean;
}

export class PokemonDetails {
    constructor(
      public id: number,
      public name: string,
      public codename: string,
      public imageUrl: string,
      public officialArtworkUrl: string,
      public officialArtworkShinyUrl: string,
      public animatedSpriteUrl: string,
      public cryUrl: string,
      public height: number,
      public weight: number,
      public types: string[],
      public abilities: Ability[],
      public varieties: Variety[],
      public superWeakTo: string[],
      public weakTo: string[],
      public normal: string[],
      public resistantTo: string[],
      public superResistantTo: string[],
      public immuneTo: string[],
      public pokedexDescriptions: DexDescription[],
      public stats: Stat[],
      public genderRate: number,
      public habitat: string,
      public generation: string,
      public evolutionChain: EvoNode | null,
      public genus: string,
      public eggGroups: string[],
      public captureRate: number,
      public baseHappiness: number,
      public growthRate: string
    ) {}
  }

  export const loadPokemonDetails = async (id: number): Promise<PokemonDetails | undefined> => {
    try {
      const data = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const speciesData = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const imageUrl = data.sprites.front_default;
      const officialArtworkUrl = data.sprites.other["official-artwork"].front_default;
      const officialArtworkShinyUrl = data.sprites.other["official-artwork"].front_shiny || officialArtworkUrl;
      const cryUrl = data.cries?.latest || '';
      const height = data.height;
      const weight = data.weight;
      const types = data.types.map((type: any) => type.type.name);
      const abilitiesData = data.abilities;
      const abilitiesDescriptions = await getAbilitiesDescriptions(abilitiesData);
      const abilities = abilitiesData.map((abilityData: any, index: number) => {
        return {
          name: abilityData.ability.name,
          description: abilitiesDescriptions[index],
          is_hidden: abilityData.is_hidden,
        };
      });
      const stats = data.stats.map((stat: any) => {
        return {
          name: stat.stat.name,
          value: stat.base_stat
        };
      });
      const damageRelations = await getPokemonDamageRelations(id);
      const pokedexDescriptions = await getPokemonDescriptions(id);
      const codename = data.species.name;
      const nameEntry = speciesData.names.find((entry: { language: { name: string } }) => entry.language.name === 'en');
      const name = nameEntry ? nameEntry.name : codename.charAt(0).toUpperCase() + codename.slice(1);
      
      const genderRate = speciesData.gender_rate;
      const habitat = speciesData.habitat?.name || 'unknown';
      const generation = speciesData.generation?.name || 'unknown';
      const evolutionChain = await getEvolutionChain(speciesData.evolution_chain?.url);
      
      // New fields
      const animatedSpriteUrl = data.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default || '';
      const genusEntry = speciesData.genera?.find((g: any) => g.language.name === 'en');
      const genus = genusEntry ? genusEntry.genus : '';
      const eggGroups = speciesData.egg_groups?.map((eg: any) => eg.name) || [];
      const captureRate = speciesData.capture_rate || 0;
      const baseHappiness = speciesData.base_happiness || 0;
      const growthRate = speciesData.growth_rate?.name || 'unknown';
      const varieties = speciesData.varieties.map((v: any) => ({
        name: v.pokemon.name,
        url: v.pokemon.url,
        is_default: v.is_default,
      }));

      return new PokemonDetails(
        id,
        name,
        codename,
        imageUrl,
        officialArtworkUrl,
        officialArtworkShinyUrl,
        animatedSpriteUrl,
        cryUrl,
        height,
        weight,
        types,
        abilities,
        varieties,
        damageRelations.superWeakTo,
        damageRelations.weakTo,
        damageRelations.normal,
        damageRelations.resistantTo,
        damageRelations.superResistantTo,
        damageRelations.immuneTo,
        pokedexDescriptions,
        stats,
        genderRate,
        habitat,
        generation,
        evolutionChain,
        genus,
        eggGroups,
        captureRate,
        baseHappiness,
        growthRate
      );
    } catch (error) {
      console.error("Error fetching data from the PokeAPI:", error);
      return undefined;
    }
  };

  function cleanText(text: string): string {
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async function getAbilitiesDescriptions(abilities: { ability: { url: string } }[]): Promise<string[]> {
    const descriptions = await Promise.all(
      abilities.map(async ({ ability: { url } }) => {
        const data = await cachedFetchJson(url);
        const englishDescription = data.effect_entries.find((entry: { language: { name: string } }) => entry.language.name === 'en');
        return englishDescription ? englishDescription.effect : 'No description available';
      })
    );
    return descriptions;
  }

  async function getPokemonDescriptions(pokemonId: number): Promise<DexDescription[]> {
    const data = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
    const englishFlavorTextEntries = data.flavor_text_entries.filter((entry: { language: { name: string } }) => entry.language.name === 'en');
    if (englishFlavorTextEntries.length > 0) {
      const pokedexDescriptions: DexDescription[] = englishFlavorTextEntries.map((entry: { flavor_text: string; version: { name: string } }) => {
        return { 'version': entry.version.name, 'flavor_text': cleanText(entry.flavor_text) };
      });
      return pokedexDescriptions;
    } else {
      console.error(`No English flavor text entry found for Pokémon ID ${pokemonId}`);
      return [{ 'version': 'no version', 'flavor_text': 'No description available' }];
    }
  }

  async function getPokemonDamageRelations(pokemonId: number): Promise<{
    superWeakTo: string[];
    weakTo: string[];
    normal: string[];
    resistantTo: string[];
    superResistantTo: string[];
    immuneTo: string[];
  }> {
    const data = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    const types = data.types.map((type: { type: { url: string } }) => type.type);

    const damageRelations: DamageRelation[] = await Promise.all(types.map(async (type: { url: string }) => {
      const typeData = await cachedFetchJson(type.url);
      return typeData.damage_relations;
    }));

    const pokemonTypes = [
      'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water',
      'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy',
    ];

    const typeRelationMultipliers: { [key: string]: number } = {};

    damageRelations.forEach((relations: DamageRelation) => {
      relations.double_damage_from.forEach((relation) => {
        typeRelationMultipliers[relation.name] = (typeRelationMultipliers[relation.name] || 1) * 2;
      });
      relations.half_damage_from.forEach((relation) => {
        typeRelationMultipliers[relation.name] = (typeRelationMultipliers[relation.name] || 1) * 0.5;
      });
      relations.no_damage_from.forEach((relation) => {
        typeRelationMultipliers[relation.name] = 0;
      });
    });

    const superWeakTo: string[] = [];
    const weakTo: string[] = [];
    const normal: string[] = [];
    const resistantTo: string[] = [];
    const superResistantTo: string[] = [];
    const immuneTo: string[] = [];

    for (const type of pokemonTypes) {
      const multiplier = typeRelationMultipliers[type];

      if (multiplier === 0) {
        immuneTo.push(type);
      } else if (multiplier === 4) {
        superWeakTo.push(type);
      } else if (multiplier === 2) {
        weakTo.push(type);
      } else if (multiplier === 0.5) {
        resistantTo.push(type);
      } else if (multiplier === 0.25) {
        superResistantTo.push(type);
      } else {
        normal.push(type);
      }
    }

    return {
      superWeakTo,
      weakTo,
      normal,
      resistantTo,
      superResistantTo,
      immuneTo,
    };
  }

  async function getEvolutionChain(evolutionChainUrl: string | undefined): Promise<EvoNode | null> {
    if (!evolutionChainUrl) return null;
    await ensureRegionsLoaded();

    try {
      const data = await cachedFetchJson(evolutionChainUrl);

      const artwork = (id: number): string =>
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
      const idFromUrl = (url: string): number => parseInt(url.split('/').filter(Boolean).pop() as string);

      const titleCase = (s: string): string =>
        s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      // The condition to trigger a battle-only transformation (mega stone,
      // Gigantamax Factor, an ability…), shown under the "↔" like an evo trigger.
      // Dedupe: a form may repeat the same trigger across several conditions
      // (Ultra Necrozma lists "held Ultranecrozium Z" once per base form). The
      // "--held"/"--bag" suffix on Z-crystal item names is dropped for display.
      const buildBattleTrigger = (conditions: any[]): string =>
        Array.from(new Set(
          (conditions || [])
            .map((c: any) => titleCase((c.name || c.trigger || '').replace(/--(held|bag)$/, '')))
            .filter(Boolean)
        )).join(' + ');

      const buildTriggerDetails = (detail: any): string => {
        const trigger = detail.trigger?.name || '';
        const detailParts: string[] = [];
        if (detail.min_level) detailParts.push(`Lv. ${detail.min_level}`);
        if (detail.item) detailParts.push(`${detail.item.name.replace(/-/g, ' ')}`);
        if (detail.held_item) detailParts.push(`Hold ${detail.held_item.name.replace(/-/g, ' ')}`);
        if (detail.min_happiness) detailParts.push(`Happiness`);
        if (detail.min_affection) detailParts.push(`Affection`);
        if (detail.time_of_day) detailParts.push(`${detail.time_of_day}`);
        if (detail.location) detailParts.push(`Special location`);
        if (detail.known_move) detailParts.push(`Know move`);
        if (detail.known_move_type) detailParts.push(`${detail.known_move_type.name} move`);
        if (detail.min_damage_taken) detailParts.push(`Recoil damage (${detail.min_damage_taken} HP)`);
        // Some evolutions are gender-locked (Combee → Vespiquen ♀, Kirlia → Gallade ♂).
        if (detail.gender === 1) detailParts.push('Female');
        else if (detail.gender === 2) detailParts.push('Male');
        if (detail.trade_species) detailParts.push(`Trade`);
        if (trigger === 'trade' && detailParts.length === 0) detailParts.push('Trade');
        return detailParts.join(' + ') || trigger.replace(/-/g, ' ');
      };

      const processChain = async (chain: any): Promise<EvoNode> => {
        const codename = chain.species.name;
        const speciesUrl = chain.species.url;
        const speciesId = idFromUrl(speciesUrl);

        const speciesData = await cachedFetchJson(speciesUrl);
        const varieties = speciesData.varieties || [];

        const capName = codename.charAt(0).toUpperCase() + codename.slice(1);
        const defaultVar = varieties.find((v: any) => v.is_default) || { pokemon: { name: codename, url: speciesUrl } };
        const defaultName = defaultVar.pokemon.name;
        const allFormNames: string[] = varieties.map((v: any) => v.pokemon.name);
        const varietyNames = new Set<string>(allFormNames);
        const suffixOf = (name: string) =>
          name.startsWith(codename + '-') ? name.slice(codename.length + 1) : name.split('-').slice(1).join('-');
        // The English name of a form ("Galarian Meowth", "Hisuian Growlithe")
        // comes straight from the form endpoint, so the region adjective doesn't
        // need to be hardcoded. `fd` is the fetched pokemon-form (may be null).
        const englishName = (fd: any): string | undefined =>
          (fd?.names || []).find((n: any) => n.language?.name === 'en')?.name;
        const labelFor = (name: string, fd?: any): string => {
          if (name === defaultName) return capName;
          const suffix = suffixOf(name);
          const region = regionOf(name);
          // Pure regional forms (suffix is exactly the region token) use the
          // API's localized name; compound/other forms keep the "(Suffix)" style.
          if (region !== 'default' && suffix === region) {
            return englishName(fd) || `${capName} (${titleCase(suffix)})`;
          }
          return `${capName} (${titleCase(suffix)})`;
        };

        // Fetch every non-default variety's form data once (in parallel) to know
        // which are battle-only and how they're triggered.
        const nonDefault = varieties.filter((v: any) => !v.is_default);
        const formInfos = await Promise.all(nonDefault.map(async (v: any) => {
          try {
            const fd = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-form/${v.pokemon.name}/`);
            return { v, fd };
          } catch (e) { return { v, fd: null }; }
        }));

        // Permanent variants (default + regional + cosmetic); battle-only forms
        // are handled separately. The region comes from the form name, so any
        // non-region difference (single-strike, midday…) stays on the default
        // line and shows as a branch rather than a separate chain.
        const defaultId = idFromUrl(defaultVar.pokemon.url);
        const variants: EvoFormVariant[] = [
          { id: defaultId, formName: defaultName, name: capName, imageUrl: artwork(defaultId), region: regionOf(defaultName) },
        ];
        for (const { v, fd } of formInfos) {
          if (fd && fd.is_battle_only) continue;
          const vId = idFromUrl(v.pokemon.url);
          variants.push({ id: vId, formName: v.pokemon.name, name: labelFor(v.pokemon.name, fd), imageUrl: artwork(vId), region: regionOf(v.pokemon.name) });
        }

        // Persistent form pairs (Minior meteor ↔ core): non-battle-only forms
        // that name a sibling in their trigger conditions. The map is
        // bidirectional (so it covers the default form via its counterpart's
        // condition); each variant then links to its counterpart for the "↔".
        const idByName: { [n: string]: number } = {};
        for (const vv of varieties) idByName[vv.pokemon.name] = idFromUrl(vv.pokemon.url);
        const transformMap: { [n: string]: { counterpart: string; trigger: string } } = {};
        for (const { v, fd } of formInfos) {
          if (!fd || fd.is_battle_only) continue;  // battle-only handled below
          const conds = fd.trigger_conditions || [];
          const trigger = buildBattleTrigger(conds);
          for (const c of conds) {
            const b = c.base_form?.name;
            if (b && varietyNames.has(b) && b !== v.pokemon.name) {
              transformMap[v.pokemon.name] = { counterpart: b, trigger };
              if (!transformMap[b]) transformMap[b] = { counterpart: v.pokemon.name, trigger };
            }
          }
        }
        for (const variant of variants) {
          const t = transformMap[variant.formName];
          if (t && idByName[t.counterpart] !== undefined) {
            const cid = idByName[t.counterpart];
            variant.transform = { id: cid, formName: t.counterpart, name: labelFor(t.counterpart), imageUrl: artwork(cid), trigger: t.trigger };
          }
        }

        // Battle-only forms: transient transformations attached to the sibling
        // form(s) they transform from. PokeAPI names those directly on each
        // trigger condition (base_form); a null base_form means the default
        // form (e.g. Mega Charizard), so fall back to it.
        const battleForms: EvoBattleForm[] = [];
        for (const { v, fd } of formInfos) {
          if (!fd || !fd.is_battle_only) continue;
          const vId = idFromUrl(v.pokemon.url);
          const formName = fd.form_name || suffixOf(v.pokemon.name);
          const conditions = fd.trigger_conditions || [];

          let baseForms: string[] = Array.from(new Set<string>(
            conditions
              .map((c: any) => c.base_form?.name)
              .filter((n: string) => n && varietyNames.has(n))
          ));
          if (baseForms.length === 0) baseForms = [defaultName];
          battleForms.push({
            id: vId,
            formName: v.pokemon.name,
            name: `${titleCase(formName)} ${capName}`,
            imageUrl: artwork(vId),
            trigger: buildBattleTrigger(conditions),
            baseForms,
          });
        }

        const children: EvoEdge[] = await Promise.all(
          chain.evolves_to.map(async (evo: any): Promise<EvoEdge> => {
            const paths: EvoPath[] = (evo.evolution_details || []).map((detail: any) => ({
              baseForm: detail.base_form?.name || null,
              evolvedForm: detail.evolved_form?.name || null,
              trigger: buildTriggerDetails(detail),
            }));
            if (paths.length === 0) paths.push({ baseForm: null, evolvedForm: null, trigger: '' });
            return { node: await processChain(evo), paths };
          })
        );

        return { speciesId, codename, defaultFormName: defaultName, variants, allFormNames, battleForms, children };
      };

      return await processChain(data.chain);
    } catch (error) {
      console.error("Error fetching evolution chain:", error);
      return null;
    }
  }
