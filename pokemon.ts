import { fetchJson } from "./fetch-json";

export class Pokemon {
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
    const pokemons: Array<Pokemon> = [];

    for (let i = 1; i <= n; i++) {
        try {
            const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${i}`);
            const speciesData = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${i}`);

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

            pokemons.push(new Pokemon(i, name, codename, imageUrl, types, is_baby, is_legendary, is_mythical, officialArtworkUrl, generation));
        } catch (error) {
            console.error(`Error fetching data for Pokémon ID ${i}:`, error);
        }
    }
    return pokemons;
};
