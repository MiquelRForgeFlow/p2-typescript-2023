interface DamageRelation {
  double_damage_from: { name: string }[];
  half_damage_from: { name: string }[];
  no_damage_from: { name: string }[];
}

interface Ability {
  name: string;
  description: string;
  is_hidden: boolean;
  generation?: string;
}

interface Stat {
  name: string;
  value: number;
}

interface DexDescription {
  version: string;
  flavor_text: string;
}

interface EvolutionStep {
  id: number;
  name: string;
  imageUrl: string;
  trigger: string;
  triggerDetails: string;
  evolvesTo: EvolutionStep[];
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
      public pastAbilities: Ability[],
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
      public evolutionChain: EvolutionStep[],
      public genus: string,
      public eggGroups: string[],
      public captureRate: number,
      public baseHappiness: number,
      public growthRate: string
    ) {}
  }

  export const loadPokemonDetails = async (id: number): Promise<PokemonDetails | undefined> => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await response.json();
      const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const speciesData = await speciesResponse.json();
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
      const pastAbilitiesData: { ability: { name: string, url: string }, is_hidden: boolean, generation?: string }[] = [];
      for (const pastAbilityData of data.past_abilities) {
        const generationName = await getGenerationName(pastAbilityData.generation);
        for (const abilityData of pastAbilityData.abilities) {
          pastAbilitiesData.push({
            ability: abilityData.ability,
            is_hidden: abilityData.is_hidden,
            generation: generationName,
          });
        }
      }
      const pastAbilitiesDescriptions = await getAbilitiesDescriptions(pastAbilitiesData);
      const pastAbilities = pastAbilitiesData.map((abilityData: any, index: number) => {
        return {
          name: abilityData.ability.name,
          description: pastAbilitiesDescriptions[index],
          is_hidden: abilityData.is_hidden,
          generation: abilityData.generation,
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
        pastAbilities,
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
        const response = await fetch(url);
        const data = await response.json();
        const englishDescription = data.effect_entries.find((entry: { language: { name: string } }) => entry.language.name === 'en');
        return englishDescription ? englishDescription.effect : 'No description available';
      })
    );
    return descriptions;
  }

  async function getGenerationName(generationData: { url: string }): Promise<string> {
    const response = await fetch(generationData.url);
    const data = await response.json();
    const englishName = data.names.find((entry: { language: { name: string } }) => entry.language.name === 'en').name;
    return englishName;
  }

  async function getPokemonDescriptions(pokemonId: number): Promise<DexDescription[]> {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
    const data = await response.json();
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
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    const data = await response.json();
    const types = data.types.map((type: { type: { url: string } }) => type.type);

    const damageRelations: DamageRelation[] = await Promise.all(types.map(async (type: { url: string }) => {
      const response = await fetch(type.url);
      const data = await response.json();
      return data.damage_relations;
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

  async function getEvolutionChain(evolutionChainUrl: string | undefined): Promise<EvolutionStep[]> {
    if (!evolutionChainUrl) return [];
    
    try {
      const response = await fetch(evolutionChainUrl);
      const data = await response.json();
      
      const processChain = async (chain: any): Promise<EvolutionStep> => {
        const speciesName = chain.species.name;
        const speciesUrl = chain.species.url;
        const speciesId = parseInt(speciesUrl.split('/').filter(Boolean).pop());
        
        const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${speciesId}`);
        const pokemonData = await pokemonResponse.json();
        const imageUrl = pokemonData.sprites.other["official-artwork"].front_default;
        
        let trigger = '';
        let triggerDetails = '';
        
        if (chain.evolution_details && chain.evolution_details.length > 0) {
          const details = chain.evolution_details[0];
          trigger = details.trigger?.name || '';
          
          const detailParts: string[] = [];
          if (details.min_level) detailParts.push(`Lv. ${details.min_level}`);
          if (details.item) detailParts.push(`${details.item.name.replace(/-/g, ' ')}`);
          if (details.held_item) detailParts.push(`Hold ${details.held_item.name.replace(/-/g, ' ')}`);
          if (details.min_happiness) detailParts.push(`Happiness`);
          if (details.min_affection) detailParts.push(`Affection`);
          if (details.time_of_day) detailParts.push(`${details.time_of_day}`);
          if (details.location) detailParts.push(`Special location`);
          if (details.known_move) detailParts.push(`Know move`);
          if (details.known_move_type) detailParts.push(`${details.known_move_type.name} move`);
          if (details.trade_species) detailParts.push(`Trade`);
          if (trigger === 'trade' && detailParts.length === 0) detailParts.push('Trade');
          
          triggerDetails = detailParts.join(' + ') || trigger.replace(/-/g, ' ');
        }
        
        const evolvesTo: EvolutionStep[] = await Promise.all(
          chain.evolves_to.map((evo: any) => processChain(evo))
        );
        
        return {
          id: speciesId,
          name: speciesName.charAt(0).toUpperCase() + speciesName.slice(1),
          imageUrl,
          trigger,
          triggerDetails,
          evolvesTo
        };
      };
      
      const rootEvolution = await processChain(data.chain);
      return [rootEvolution];
    } catch (error) {
      console.error("Error fetching evolution chain:", error);
      return [];
    }
  }
