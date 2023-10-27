import { writeFile } from "fs/promises";
import { loadPokemons, Pokemon } from "./pokemon";
import { loadPokemonDetails, PokemonDetails } from "./pokemon-detail"

function toPokemonType(type: string): PokemonType {
  return type as PokemonType;
}

function renderPokemonIndex(pokemons: Array<Pokemon>): string {
    const pokemonLinks = pokemons.map((pokemon) => `
      <li>
        <a class="pokemon-card" href="${String(pokemon.id).padStart(4, '0')}_details.html" data-types='${JSON.stringify(pokemon.types)}' data-baby='${pokemon.is_baby}' data-legendary='${pokemon.is_legendary}' data-mythical='${pokemon.is_mythical}' data-generation='${pokemon.generation}' data-id='${pokemon.id}' data-name='${pokemon.name}' style="background-image: linear-gradient(135deg, ${getTypeColor(toPokemonType(pokemon.types[0]))} 0%, ${getTypeColor(toPokemonType(pokemon.types[0]))} 50%, ${pokemon.types[1] ? getTypeColor(toPokemonType(pokemon.types[1])) : getTypeColor(toPokemonType(pokemon.types[0]))} 50%, ${pokemon.types[1] ? getTypeColor(toPokemonType(pokemon.types[1])) : getTypeColor(toPokemonType(pokemon.types[0]))} 100%);">
          <div class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</div>
          <img class="lazyload" data-src="${pokemon.imageUrl}" alt="${pokemon.name}" />
          <h2>${pokemon.name}</h2>
        </a>
      </li>
    `).join('\n');

    return `
  <html>
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='47' fill='%23f0f0f0' stroke='%23333' stroke-width='6'/><path d='M3 50 A47 47 0 0 1 97 50' fill='%23ee1515'/><rect x='0' y='46' width='100' height='8' fill='%23333'/><circle cx='50' cy='50' r='12' fill='%23fff' stroke='%23333' stroke-width='6'/><circle cx='50' cy='50' r='5' fill='%23333'/></svg>">
      <title>PokeQuickDex</title>
      <meta name="description" content="PokeQuickDex - Your quick reference for all Pokémon stats, types, abilities, and evolution chains. Browse all 1025 Pokémon!">
      <meta property="og:title" content="PokeQuickDex - Complete Pokémon Database">
      <meta property="og:description" content="Browse all 1025 Pokémon with stats, types, abilities, and evolution chains.">
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://pokequickdex.vercel.app">
      <link rel="stylesheet" href="css/styles.css">
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5418523060607609" crossorigin="anonymous"></script>
      <link rel="canonical" href="https://pokequickdex.vercel.app" />
      <script defer src="/_vercel/insights/script.js"></script>
    </head>
    <body>
      <div class="header-container">
        <h1>Poke Quick Dex</h1>
        <button id="dark-mode-toggle" class="dark-mode-toggle" title="Toggle Dark Mode">🌙</button>
      </div>
      <div class="toolbar">
        <div class="toolbar-row">
          <input type="text" id="search-input" class="search-input" placeholder="Search..." />
          <select id="type-select" class="filter-select">
            <option value="">Type</option>
            <option value="normal">Normal</option>
            <option value="fighting">Fighting</option>
            <option value="flying">Flying</option>
            <option value="poison">Poison</option>
            <option value="ground">Ground</option>
            <option value="rock">Rock</option>
            <option value="bug">Bug</option>
            <option value="ghost">Ghost</option>
            <option value="steel">Steel</option>
            <option value="fire">Fire</option>
            <option value="water">Water</option>
            <option value="grass">Grass</option>
            <option value="electric">Electric</option>
            <option value="psychic">Psychic</option>
            <option value="ice">Ice</option>
            <option value="dragon">Dragon</option>
            <option value="dark">Dark</option>
            <option value="fairy">Fairy</option>
          </select>
          <select id="generation-select" class="filter-select">
            <option value="">Gen</option>
            <option value="generation-i">I</option>
            <option value="generation-ii">II</option>
            <option value="generation-iii">III</option>
            <option value="generation-iv">IV</option>
            <option value="generation-v">V</option>
            <option value="generation-vi">VI</option>
            <option value="generation-vii">VII</option>
            <option value="generation-viii">VIII</option>
            <option value="generation-ix">IX</option>
          </select>
          <button id="compare-mode-btn" class="compare-mode-btn" title="Compare Mode">⚔️</button>
        </div>
        <div class="toolbar-row toolbar-tags">
          <label class="tag-filter"><input type="checkbox" id="baby-filter" /><span>Baby</span></label>
          <label class="tag-filter"><input type="checkbox" id="legendary-filter" /><span>Legendary</span></label>
          <label class="tag-filter"><input type="checkbox" id="mythical-filter" /><span>Mythical</span></label>
          <button id="clear-filters-btn" class="clear-filters-btn" style="display: none;" title="Clear all filters">✕ Clear</button>
        </div>
      </div>
      <div id="compare-bar" class="compare-bar" style="display: none;">
        <span id="compare-pokemon-1" class="compare-slot">Click 1st Pokémon</span>
        <span class="vs-text">VS</span>
        <span id="compare-pokemon-2" class="compare-slot">Click 2nd Pokémon</span>
        <button id="compare-btn" class="compare-action-btn">Go!</button>
        <button id="clear-compare-btn" class="clear-compare-btn">✕</button>
      </div>
      <div id="compare-modal" class="compare-modal" style="display: none;">
        <div class="compare-modal-content">
          <span class="close-modal">&times;</span>
          <div id="compare-results" class="compare-results"></div>
        </div>
      </div>
      <ul>${pokemonLinks}</ul>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          // Dark mode
          const darkModeToggle = document.getElementById("dark-mode-toggle");
          const savedDarkMode = localStorage.getItem("darkMode") === "true";
          if (savedDarkMode) {
            document.body.classList.add("dark-mode");
            darkModeToggle.textContent = "☀️";
          }
          darkModeToggle.addEventListener("click", function() {
            document.body.classList.toggle("dark-mode");
            const isDark = document.body.classList.contains("dark-mode");
            localStorage.setItem("darkMode", isDark);
            darkModeToggle.textContent = isDark ? "☀️" : "🌙";
          });

          // Compare functionality
          let compareList = [];
          let compareMode = false;
          const compareModeBtn = document.getElementById("compare-mode-btn");
          const compareBar = document.getElementById("compare-bar");
          const compareSlot1 = document.getElementById("compare-pokemon-1");
          const compareSlot2 = document.getElementById("compare-pokemon-2");
          const compareModal = document.getElementById("compare-modal");
          const compareResults = document.getElementById("compare-results");
          
          compareModeBtn.addEventListener("click", function() {
            compareMode = !compareMode;
            compareModeBtn.classList.toggle("active", compareMode);
            if (compareMode) {
              compareBar.style.display = "flex";
            } else {
              compareBar.style.display = "none";
              compareList = [];
              updateCompareBar();
            }
          });

          document.querySelectorAll(".pokemon-card").forEach(card => {
            card.addEventListener("click", function(e) {
              if (compareMode) {
                e.preventDefault();
                const id = this.dataset.id;
                const name = this.dataset.name;
                if (compareList.length < 2 && !compareList.find(p => p.id === id)) {
                  compareList.push({ id, name });
                  this.classList.add("selected-compare");
                  updateCompareBar();
                }
              }
            });
          });

          function updateCompareBar() {
            compareSlot1.textContent = compareList[0]?.name || "Click 1st Pokémon";
            compareSlot2.textContent = compareList[1]?.name || "Click 2nd Pokémon";
          }

          document.getElementById("clear-compare-btn").addEventListener("click", function() {
            compareList = [];
            compareMode = false;
            compareModeBtn.classList.remove("active");
            compareBar.style.display = "none";
            document.querySelectorAll(".selected-compare").forEach(el => el.classList.remove("selected-compare"));
            updateCompareBar();
          });

          document.getElementById("compare-btn").addEventListener("click", async function() {
            if (compareList.length !== 2) return;
            compareResults.innerHTML = "<p>Loading...</p>";
            compareModal.style.display = "flex";
            
            const pokemon1 = await fetch(\`https://pokeapi.co/api/v2/pokemon/\${compareList[0].id}\`).then(r => r.json());
            const pokemon2 = await fetch(\`https://pokeapi.co/api/v2/pokemon/\${compareList[1].id}\`).then(r => r.json());
            
            const stats1 = pokemon1.stats.reduce((acc, s) => { acc[s.stat.name] = s.base_stat; return acc; }, {});
            const stats2 = pokemon2.stats.reduce((acc, s) => { acc[s.stat.name] = s.base_stat; return acc; }, {});
            const total1 = Object.values(stats1).reduce((a, b) => a + b, 0);
            const total2 = Object.values(stats2).reduce((a, b) => a + b, 0);
            
            const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
            let tableRows = statNames.map(stat => {
              const v1 = stats1[stat] || 0;
              const v2 = stats2[stat] || 0;
              const winner1 = v1 > v2 ? 'winner' : v1 < v2 ? 'loser' : '';
              const winner2 = v2 > v1 ? 'winner' : v2 < v1 ? 'loser' : '';
              return \`<tr><td class="\${winner1}">\${v1}</td><td>\${stat.toUpperCase()}</td><td class="\${winner2}">\${v2}</td></tr>\`;
            }).join('');
            
            const totalWinner1 = total1 > total2 ? 'winner' : total1 < total2 ? 'loser' : '';
            const totalWinner2 = total2 > total1 ? 'winner' : total2 < total1 ? 'loser' : '';
            tableRows += \`<tr class="total-row"><td class="\${totalWinner1}">\${total1}</td><td>TOTAL (BST)</td><td class="\${totalWinner2}">\${total2}</td></tr>\`;
            
            compareResults.innerHTML = \`
              <div class="compare-header">
                <div class="compare-pokemon">
                  <img src="\${pokemon1.sprites.other['official-artwork'].front_default}" alt="\${pokemon1.name}">
                  <h3>\${pokemon1.name.charAt(0).toUpperCase() + pokemon1.name.slice(1)}</h3>
                </div>
                <div class="vs">VS</div>
                <div class="compare-pokemon">
                  <img src="\${pokemon2.sprites.other['official-artwork'].front_default}" alt="\${pokemon2.name}">
                  <h3>\${pokemon2.name.charAt(0).toUpperCase() + pokemon2.name.slice(1)}</h3>
                </div>
              </div>
              <table class="compare-table">
                <thead><tr><th>\${pokemon1.name}</th><th>Stat</th><th>\${pokemon2.name}</th></tr></thead>
                <tbody>\${tableRows}</tbody>
              </table>
            \`;
          });

          document.querySelector(".close-modal").addEventListener("click", function() {
            compareModal.style.display = "none";
          });

          compareModal.addEventListener("click", function(e) {
            if (e.target === compareModal) compareModal.style.display = "none";
          });

          const checkboxes = document.querySelectorAll('.tag-filter input[type="checkbox"]');
          checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
              checkboxes.forEach(box => {
                if (box !== checkbox) box.checked = false;
              });
              filterPokemons();
              saveFilters();
            });
          });

          function saveFilters() {
            const filters = {
              search: document.getElementById("search-input").value,
              type: document.getElementById("type-select").value,
              generation: document.getElementById("generation-select").value,
              baby: document.getElementById("baby-filter").checked,
              legendary: document.getElementById("legendary-filter").checked,
              mythical: document.getElementById("mythical-filter").checked
            };
            sessionStorage.setItem("pokemonFilters", JSON.stringify(filters));
          }

          function loadFilters() {
            const saved = sessionStorage.getItem("pokemonFilters");
            if (saved) {
              const filters = JSON.parse(saved);
              document.getElementById("search-input").value = filters.search || "";
              document.getElementById("type-select").value = filters.type || "";
              document.getElementById("generation-select").value = filters.generation || "";
              document.getElementById("baby-filter").checked = filters.baby || false;
              document.getElementById("legendary-filter").checked = filters.legendary || false;
              document.getElementById("mythical-filter").checked = filters.mythical || false;
              filterPokemons();
            }
          }

          function filterPokemons() {
            const searchText = document.getElementById("search-input").value.toLowerCase();
            const selectedType = document.getElementById("type-select").value;
            const selectedGeneration = document.getElementById("generation-select").value;
            const babyFilter = document.getElementById("baby-filter").checked;
            const legendaryFilter = document.getElementById("legendary-filter").checked;
            const mythicalFilter = document.getElementById("mythical-filter").checked;
            const pokemonCards = document.querySelectorAll(".pokemon-card");

            pokemonCards.forEach((pokemonCard) => {
              const pokemonName = pokemonCard.querySelector("h2").textContent.toLowerCase();
              const pokemonTypes = JSON.parse(pokemonCard.dataset.types);
              const pokemonGeneration = pokemonCard.dataset.generation;
              const isBaby = JSON.parse(pokemonCard.dataset.baby);
              const isLegendary = JSON.parse(pokemonCard.dataset.legendary);
              const isMythical = JSON.parse(pokemonCard.dataset.mythical);
              const nameMatch = !searchText || pokemonName.includes(searchText);
              const typeMatch = !selectedType || pokemonTypes.includes(selectedType);
              const generationMatch = !selectedGeneration || pokemonGeneration === selectedGeneration;
              const filterMatch = (babyFilter && isBaby) || (legendaryFilter && isLegendary) || (mythicalFilter && isMythical) || (!babyFilter && !legendaryFilter && !mythicalFilter);

              const visible = nameMatch && typeMatch && generationMatch && filterMatch;
              pokemonCard.parentElement.style.display = visible ? "block" : "none";
            });
            
            // Save filtered IDs for navigation in detail pages
            const visibleIds = [];
            pokemonCards.forEach((card) => {
              if (card.parentElement.style.display !== "none") {
                visibleIds.push(parseInt(card.dataset.id));
              }
            });
            sessionStorage.setItem("filteredPokemonIds", JSON.stringify(visibleIds));
            
            // Show/hide clear button based on active filters
            const clearBtn = document.getElementById("clear-filters-btn");
            const hasFilters = searchText || selectedType || selectedGeneration || babyFilter || legendaryFilter || mythicalFilter;
            clearBtn.style.display = hasFilters ? "inline-block" : "none";
          }
          
          function clearAllFilters() {
            document.getElementById("search-input").value = "";
            document.getElementById("type-select").value = "";
            document.getElementById("generation-select").value = "";
            document.getElementById("baby-filter").checked = false;
            document.getElementById("legendary-filter").checked = false;
            document.getElementById("mythical-filter").checked = false;
            sessionStorage.removeItem("pokemonFilters");
            filterPokemons();
          }
          
          document.getElementById("clear-filters-btn").addEventListener("click", clearAllFilters);
          document.getElementById("search-input").addEventListener("input", function() { filterPokemons(); saveFilters(); });
          document.getElementById("type-select").addEventListener("change", function() { filterPokemons(); saveFilters(); });
          document.getElementById("generation-select").addEventListener("change", function() { filterPokemons(); saveFilters(); });
          
          loadFilters();
          const lazyloadImages = document.querySelectorAll("img.lazyload");
          let imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const image = entry.target;
                image.src = image.dataset.src;
                image.classList.remove("lazyload");
                imageObserver.unobserve(image);
              }
            });
          });

          lazyloadImages.forEach((image) => {
            imageObserver.observe(image);
          });
        });
      </script>
    </body>
  </html>`;
  }

  function renderPokemonDetail(pokemon: PokemonDetails, totalPokemons: number): string {
    const types = (pokemon.types || []).map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const superWeakTo = pokemon.superWeakTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const weakTo = pokemon.weakTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const normal = pokemon.normal.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const resistantTo = pokemon.resistantTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const superResistantTo = pokemon.superResistantTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const immuneTo = pokemon.immuneTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const heightInMeters = (pokemon.height / 10).toFixed(1) + " m";
    const weightInKilograms = (pokemon.weight / 10).toFixed(1) + " kg";
    const prevId = pokemon.id > 1 ? pokemon.id - 1 : totalPokemons;
    const nextId = pokemon.id < totalPokemons ? pokemon.id + 1 : 1;
    const prevFile = `${String(prevId).padStart(4, '0')}_details.html`;
    const nextFile = `${String(nextId).padStart(4, '0')}_details.html`;
    
    const bst = pokemon.stats.reduce((sum, stat) => sum + stat.value, 0);
    
    const getGenderDisplay = (genderRate: number): string => {
      if (genderRate === -1) return '<span class="gender-icon genderless">⚪ Genderless</span>';
      const femalePercent = (genderRate / 8) * 100;
      const malePercent = 100 - femalePercent;
      return `<span class="gender-display"><span class="gender-icon male">♂${malePercent.toFixed(0)}%</span> <span class="gender-icon female">♀${femalePercent.toFixed(0)}%</span></span>`;
    };
    
    const habitatDisplay = pokemon.habitat !== 'unknown' 
      ? pokemon.habitat.charAt(0).toUpperCase() + pokemon.habitat.slice(1).replace(/-/g, ' ')
      : 'Unknown';
    
    const generationDisplay = pokemon.generation !== 'unknown'
      ? pokemon.generation.replace('generation-', 'Gen ').toUpperCase()
      : 'Unknown';
    
    const renderEvolutionStep = (evo: any, isFirst: boolean = false): string => {
      const isCurrentPokemon = evo.id === pokemon.id;
      const hasMultipleEvolutions = evo.evolvesTo && evo.evolvesTo.length > 1;
      
      let html = '';
      
      if (!isFirst && evo.triggerDetails) {
        html += `<div class="evo-arrow">→<span class="evo-trigger">${evo.triggerDetails}</span></div>`;
      }
      
      html += `
        <a href="${String(evo.id).padStart(4, '0')}_details.html" class="evo-step ${isCurrentPokemon ? 'current' : ''}">
          <img src="${evo.imageUrl}" alt="${evo.name}" />
          <span>${evo.name}</span>
        </a>
      `;
      
      if (evo.evolvesTo && evo.evolvesTo.length > 0) {
        if (hasMultipleEvolutions) {
          html += `<div class="evo-branch">`;
          html += evo.evolvesTo.map((nextEvo: any) => `
            <div class="evo-branch-row">
              <div class="evo-arrow">→<span class="evo-trigger">${nextEvo.triggerDetails || ''}</span></div>
              <a href="${String(nextEvo.id).padStart(4, '0')}_details.html" class="evo-step ${nextEvo.id === pokemon.id ? 'current' : ''}">
                <img src="${nextEvo.imageUrl}" alt="${nextEvo.name}" />
                <span>${nextEvo.name}</span>
              </a>
              ${nextEvo.evolvesTo && nextEvo.evolvesTo.length > 0 ? renderEvolutionStep(nextEvo.evolvesTo[0], false) : ''}
            </div>
          `).join('');
          html += `</div>`;
        } else {
          html += renderEvolutionStep(evo.evolvesTo[0], false);
        }
      }
      
      return html;
    };
    
    const evolutionChainHtml = pokemon.evolutionChain.length > 0 && pokemon.evolutionChain[0]
      ? (pokemon.evolutionChain[0].evolvesTo.length === 0 && !pokemon.evolutionChain[0].triggerDetails
          ? '<p class="no-evolution">This Pokémon does not evolve.</p>'
          : renderEvolutionStep(pokemon.evolutionChain[0], true))
      : '<p class="no-evolution">This Pokémon does not evolve.</p>';
    
    const abilitiesTableRows = pokemon.abilities
      .map(ability => {
        const hiddenTag = ability.is_hidden ? `<span class="hidden-ability">hidden</span>` : '';
        return `
          <tr>
            <td class="attribute abilities-text">${ability.name.charAt(0).toUpperCase() + ability.name.slice(1)}: ${hiddenTag}</td>
            <td class="value abilities-text">${ability.description}</td>
          </tr>`;
      })
      .join('\n');
    const pastAbilitiesTableRows = pokemon.pastAbilities
      .map(ability => {
        const hiddenTag = ability.is_hidden ? `<span class="hidden-ability">hidden</span>` : '';
        const generationTag = ability.generation ? `<span class="generation-ability">until ${ability.generation}</span>` : '';
        return `
          <tr>
            <td class="attribute abilities-text">${ability.name.charAt(0).toUpperCase() + ability.name.slice(1)}: ${hiddenTag} ${generationTag}</td>
            <td class="value abilities-text">${ability.description}</td>
          </tr>`;
      })
      .join('\n');
    const getStatBar = (value: number, maxValue: number) => {
      const percentage = Math.round((value / maxValue) * 100);
      const greenThreshold = 35;
      const yellowThreshold = 20;
      let backgroundColor;
      if (percentage >= greenThreshold) {
        backgroundColor = 'limegreen';
      } else if (percentage >= yellowThreshold) {
        backgroundColor = 'gold';
      } else {
        backgroundColor = 'tomato';
      }
      return `
        <div class="stat-bar-container">
          <div class="stat-bar">
            <div class="stat-value" style="width: ${percentage}%; background-color: ${backgroundColor};"></div>
          </div>
        </div>
      `;
    };
    
    const getCatchRateBar = (captureRate: number) => {
      const percentage = Math.round((captureRate / 255) * 100);
      let backgroundColor;
      if (percentage >= 50) {
        backgroundColor = 'limegreen';
      } else if (percentage >= 25) {
        backgroundColor = 'gold';
      } else {
        backgroundColor = 'tomato';
      }
      return `
        <div class="catch-rate-display">
          <span class="catch-percent">${percentage}%</span>
          <div class="catch-bar">
            <div class="catch-value" style="width: ${percentage}%; background-color: ${backgroundColor};"></div>
          </div>
        </div>
      `;
    };
  
    const statsTableRows = pokemon.stats
      .map(stat => `
        <tr>
          <td class="attribute abilities-text">${(stat.name === 'hp') ? 'HP': stat.name.charAt(0).toUpperCase() + stat.name.slice(1)}:</td>
          <td class="value abilities-text">${stat.value}</td>
          <td class="value abilities-bar">${getStatBar(stat.value, 255)}</td>
        </tr>`)
      .join('\n');
  
    const descriptionsSelect = pokemon.pokedexDescriptions
      .map(description => `
        <option value="${description.version}" class="tag">${description.version.charAt(0).toUpperCase() + description.version.slice(1)}</option>`)
      .join('\n');
  
    const descriptionsRows = pokemon.pokedexDescriptions
      .map((description, index) => `
        <p class="description" data-version='${description.version}' style="${index !== 0 ? 'display: none;' : ''}">${description.flavor_text}</p>`)
      .join('\n');
    
    return `
    <html>
      ${head(pokemon.name)}
      <body>
        <div class="header-container">
          <h1>
          <a href="index.html" class="back-to-menu"><i class="fas fa-arrow-left"></i></a> ${pokemon.name} <span class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</span>
          <span id="filter-counter" class="filter-counter"></span>
          <div class="navigation-buttons">
            <a id="prev-btn" href="${prevFile}" class="nav-button minimal-button" data-default-prev="${prevFile}">❮</a>
            <a id="next-btn" href="${nextFile}" class="nav-button minimal-button" data-default-next="${nextFile}">❯</a>
          </div>
          </h1>
        </div>
        <div class="pokemon-container">
          <div class="pokemon-image-container">
            <img id="pokemon-artwork" src="${pokemon.officialArtworkUrl}" alt="${pokemon.name}" data-normal="${pokemon.officialArtworkUrl}" data-shiny="${pokemon.officialArtworkShinyUrl}" data-animated="${pokemon.animatedSpriteUrl}" />
            <p class="pokemon-genus">${pokemon.genus}</p>
            <div class="image-controls">
              <button id="shiny-toggle" class="shiny-toggle" title="Toggle Shiny">✨ Shiny</button>
              ${pokemon.animatedSpriteUrl ? `<button id="animated-toggle" class="animated-toggle" title="Toggle Animated Sprite">🎬 Animated</button>` : ''}
              ${pokemon.cryUrl ? `<button id="cry-button" class="cry-button" title="Play Cry">🔊 Cry</button>` : ''}
            </div>
            ${pokemon.cryUrl ? `<audio id="pokemon-cry" src="${pokemon.cryUrl}"></audio>` : ''}
          </div>
          <div class="info-tables">
            <table class="combat-table">
              <tr><th colspan="2" class="section-title-cell">⚔️ Combat Info</th></tr>
              <tr><td class="attribute">Type:</td><td class="value">${types}</td></tr>
              <tr><td class="attribute" title="Higher = easier to catch">Catch Rate:</td><td class="value">${getCatchRateBar(pokemon.captureRate)}</td></tr>
              <tr><td class="attribute" title="Takes 4x damage">Super Weak (4x):</td><td class="value">${superWeakTo || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 2x damage">Weak (2x):</td><td class="value">${weakTo || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 1x damage">Normal (1x):</td><td class="value">${normal || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 0.5x damage">Resistant (½x):</td><td class="value">${resistantTo || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 0.25x damage">Super Resist (¼x):</td><td class="value">${superResistantTo || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 0x damage">Immune (0x):</td><td class="value">${immuneTo || '-'}</td></tr>
            </table>
            <table class="details-table">
              <tr><th colspan="2" class="section-title-cell">📋 Details</th></tr>
              <tr><td class="attribute">Generation:</td><td class="value"><span class="gen-badge">${generationDisplay}</span></td></tr>
              <tr><td class="attribute">Height:</td><td class="value">${heightInMeters}</td></tr>
              <tr><td class="attribute">Weight:</td><td class="value">${weightInKilograms}</td></tr>
              <tr><td class="attribute" title="Chance of being female">Gender:</td><td class="value">${getGenderDisplay(pokemon.genderRate)}</td></tr>
              <tr><td class="attribute">Habitat:</td><td class="value">${habitatDisplay}</td></tr>
              <tr><td class="attribute" title="For breeding">Egg Groups:</td><td class="value">${pokemon.eggGroups.map(eg => eg.charAt(0).toUpperCase() + eg.slice(1)).join(', ') || '-'}</td></tr>
              <tr><td class="attribute" title="Initial happiness">Base Happiness:</td><td class="value">${pokemon.baseHappiness} ${pokemon.baseHappiness >= 140 ? '😊' : pokemon.baseHappiness >= 70 ? '🙂' : '😐'}</td></tr>
              <tr><td class="attribute" title="Leveling speed">Growth Rate:</td><td class="value">${pokemon.growthRate.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td></tr>
            </table>
          </div>
        </div>
        <h2 class="section-title">Evolution Chain</h2>
        <div class="evolution-chain">
          ${evolutionChainHtml}
        </div>
        <div class="table-container">
          <table class="abilities-table">
            <tr>
              <th colspan="2" class="section-title-cell">Pokémon Abilities</th>
            </tr>
            ${abilitiesTableRows}
            <tr style="${pokemon.pastAbilities.length > 0 ? '' : 'display: none;'}">
              <th colspan="2" class="section-title-cell">Pokémon Old Abilities</th>
            </tr>
            ${pokemon.pastAbilities.length > 0 ? pastAbilitiesTableRows : ''}
          </table>
          <table>
            <tr>
              <th colspan="3" class="section-title-cell">Pokémon Stats</th>
            </tr>
            ${statsTableRows}
            <tr class="bst-row">
              <td class="attribute abilities-text">Base Stat Total:</td>
              <td class="value abilities-text bst-value" colspan="2">${bst}</td>
            </tr>
          </table>
        </div>
        <h2 class="section-title">Pokédex Description</h2>
        <div class="pokedex-container">
          <div class="version-container">
            <select id="version-select" class="version-select">
              ${descriptionsSelect}
            </select>
          </div>
          <div class="description-container">
            ${descriptionsRows}
          </div>
        </div>
        <a href="index.html" class="back-button">Back to Menu</a>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            // Apply saved dark mode
            if (localStorage.getItem("darkMode") === "true") {
              document.body.classList.add("dark-mode");
            }

            // Filtered navigation
            const currentId = ${pokemon.id};
            const filteredIds = JSON.parse(sessionStorage.getItem("filteredPokemonIds") || "[]");
            const prevBtn = document.getElementById("prev-btn");
            const nextBtn = document.getElementById("next-btn");
            const filterCounter = document.getElementById("filter-counter");
            
            if (filteredIds.length > 0 && filteredIds.includes(currentId)) {
              const currentIndex = filteredIds.indexOf(currentId);
              const total = filteredIds.length;
              filterCounter.textContent = (currentIndex + 1) + "/" + total;
              
              // Update prev button
              if (currentIndex > 0) {
                const prevId = filteredIds[currentIndex - 1];
                prevBtn.href = String(prevId).padStart(4, '0') + "_details.html";
              } else {
                prevBtn.style.visibility = "hidden";
              }
              
              // Update next button
              if (currentIndex < total - 1) {
                const nextId = filteredIds[currentIndex + 1];
                nextBtn.href = String(nextId).padStart(4, '0') + "_details.html";
              } else {
                nextBtn.style.visibility = "hidden";
              }
            }

            // Shiny toggle
            const shinyToggle = document.getElementById("shiny-toggle");
            const pokemonArtwork = document.getElementById("pokemon-artwork");
            let isShiny = false;
            let isAnimated = false;
            
            shinyToggle.addEventListener("click", function() {
              isShiny = !isShiny;
              isAnimated = false;
              const animatedToggle = document.getElementById("animated-toggle");
              if (animatedToggle) animatedToggle.classList.remove("active");
              pokemonArtwork.src = isShiny ? pokemonArtwork.dataset.shiny : pokemonArtwork.dataset.normal;
              shinyToggle.classList.toggle("active", isShiny);
              shinyToggle.textContent = isShiny ? "✨ Normal" : "✨ Shiny";
            });

            // Animated toggle
            const animatedToggle = document.getElementById("animated-toggle");
            if (animatedToggle) {
              animatedToggle.addEventListener("click", function() {
                isAnimated = !isAnimated;
                isShiny = false;
                shinyToggle.classList.remove("active");
                shinyToggle.textContent = "✨ Shiny";
                pokemonArtwork.src = isAnimated ? pokemonArtwork.dataset.animated : pokemonArtwork.dataset.normal;
                animatedToggle.classList.toggle("active", isAnimated);
                animatedToggle.textContent = isAnimated ? "🎬 Static" : "🎬 Animated";
              });
            }

            // Cry button
            const cryButton = document.getElementById("cry-button");
            const pokemonCry = document.getElementById("pokemon-cry");
            if (cryButton && pokemonCry) {
              cryButton.addEventListener("click", function() {
                pokemonCry.currentTime = 0;
                pokemonCry.play();
              });
            }

            // Version filter
            function filterVersions() {
              const selectedVersion = document.getElementById("version-select").value;
              const dexDescriptions = document.querySelectorAll(".description");
              for (const dexDescription of dexDescriptions) {
                const version = dexDescription.dataset.version;
                if (selectedVersion === version) {
                  dexDescription.style.display = "block";
                } else {
                  dexDescription.style.display = "none";
                }
              }
            }
            document.getElementById("version-select").addEventListener("change", filterVersions);
          });
        </script>
      </body>
    </html>`;
  }  

  type PokemonType =
  | 'normal'
  | 'fighting'
  | 'flying'
  | 'poison'
  | 'ground'
  | 'rock'
  | 'bug'
  | 'ghost'
  | 'steel'
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'psychic'
  | 'ice'
  | 'dragon'
  | 'dark'
  | 'fairy';

function getTypeColor(type: PokemonType): string {
  const colors: Record<PokemonType, string> = {
    normal: "rgba(168, 168, 120, 0.5)",
    fighting: "rgba(192, 48, 40, 0.5)",
    flying: "rgba(168, 144, 240, 0.5)",
    poison: "rgba(160, 64, 160, 0.5)",
    ground: "rgba(224, 192, 104, 0.5)",
    rock: "rgba(184, 160, 56, 0.5)",
    bug: "rgba(168, 184, 32, 0.5)",
    ghost: "rgba(112, 88, 152, 0.5)",
    steel: "rgba(184, 184, 208, 0.5)",
    fire: "rgba(240, 128, 48, 0.5)",
    water: "rgba(104, 144, 240, 0.5)",
    grass: "rgba(120, 200, 80, 0.5)",
    electric: "rgba(248, 208, 48, 0.5)",
    psychic: "rgba(248, 88, 136, 0.5)",
    ice: "rgba(152, 216, 216, 0.5)",
    dragon: "rgba(112, 56, 248, 0.5)",
    dark: "rgba(112, 88, 72, 0.5)",
    fairy: "rgba(238, 153, 172, 0.5)",
  };
  return colors[type] || "#ccc";
}

function head(title: string): string {
  return `
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='47' fill='%23f0f0f0' stroke='%23333' stroke-width='6'/><path d='M3 50 A47 47 0 0 1 97 50' fill='%23ee1515'/><rect x='0' y='46' width='100' height='8' fill='%23333'/><circle cx='50' cy='50' r='12' fill='%23fff' stroke='%23333' stroke-width='6'/><circle cx='50' cy='50' r='5' fill='%23333'/></svg>">
  <title>${title}</title>
  <link rel="stylesheet" href="css/pokemon_styles.css">
  <script defer src="/_vercel/insights/script.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
</head>`;
}

(async () => {
  const pokemons = await loadPokemons(1025);
  const indexHtml = renderPokemonIndex(pokemons);
  await writeFile("index.html", indexHtml);

  for (const pokemon of pokemons) {
    const pokemonDetail = await loadPokemonDetails(pokemon.id);
    if (!pokemonDetail) {
      console.warn(`Failed to load details for Pokémon with ID ${pokemon.id}.`);
      continue;
    }
    const detailHtml = renderPokemonDetail(pokemonDetail, 1025);
    await writeFile(`${String(pokemonDetail.id).padStart(4, '0')}_details.html`, detailHtml);
  }
})();
