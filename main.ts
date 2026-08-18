import { writeFile } from "fs/promises";
import { loadPokemons, Pokemon } from "./pokemon";
import { loadPokemonDetails, PokemonDetails } from "./pokemon-detail"
import { regionOf, ensureRegionsLoaded, REGION_TOKENS } from "./regions";
import { ensureTypesLoaded, ALL_TYPES } from "./types";

function renderPokemonIndex(pokemons: Array<Pokemon>): string {
    const typeGradient = (types: string[]) => {
      const a = getTypeColor(types[0]);
      const b = types[1] ? getTypeColor(types[1]) : a;
      return `linear-gradient(135deg, ${a} 0%, ${a} 50%, ${b} 50%, ${b} 100%)`;
    };
    const pokemonLinks = pokemons.map((pokemon) => {
      const dexNo = String(pokemon.id).padStart(4, '0');
      const baseCard = `
      <li>
        <a class="pokemon-card" href="${dexNo}_details.html" data-types='${JSON.stringify(pokemon.types)}' data-baby='${pokemon.is_baby}' data-legendary='${pokemon.is_legendary}' data-mythical='${pokemon.is_mythical}' data-generation='${pokemon.generation}' data-id='${pokemon.id}' data-name='${pokemon.name}' style="background-image: ${typeGradient(pokemon.types)};">
          <div class="pokemon-id">#${dexNo}</div>
          <img class="lazyload" data-src="${pokemon.imageUrl}" alt="${pokemon.name}" />
          <h2>${pokemon.name}</h2>
        </a>
      </li>`;
      // Form cards share the species' dex number/tags but carry the form's own
      // types, and link to the detail page with a #hash so it opens in that form.
      // Hidden until the "All forms" toggle is on.
      const formCards = pokemon.forms.map((form) => `
      <li style="display: none;">
        <a class="pokemon-card form-variant" href="${dexNo}_details.html#${form.suffix}" data-types='${JSON.stringify(form.types)}' data-baby='${pokemon.is_baby}' data-legendary='${pokemon.is_legendary}' data-mythical='${pokemon.is_mythical}' data-generation='${form.generation}' data-id='${form.id}' data-name='${form.name}' data-formkind='${form.kind}' style="background-image: ${typeGradient(form.types)};">
          <div class="pokemon-id">#${dexNo}</div>
          <img class="lazyload" data-src="${form.imageUrl}" data-default-img="${pokemon.officialArtworkUrl}" alt="${form.name}" />
          <h2>${form.name}</h2>
        </a>
      </li>`).join('\n');
      return baseCard + formCards;
    }).join('\n');

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
      <script>
        // On image error, retry the official artwork a few times (transient
        // github hiccups) before falling back to Dream World, then the sprite.
        // Capture phase, so it catches cards loading before other scripts run.
        document.addEventListener('error', function (ev) {
          var img = ev.target;
          if (!img || img.tagName !== 'IMG') return;
          var src = img.src.split('?')[0];
          if (src.indexOf('/other/official-artwork/') !== -1) {
            var tries = +(img.getAttribute('data-oa-retry') || 0);
            if (tries < 3) {
              img.setAttribute('data-oa-retry', tries + 1);
              setTimeout(function () { img.src = src + '?r=' + (tries + 1); }, 300 * (tries + 1));
            } else if (src.indexOf('/official-artwork/shiny/') !== -1) {
              img.src = src.replace('/other/official-artwork/', '/');            // shiny: go to shiny sprite
            } else {
              img.src = src.replace('/other/official-artwork/', '/other/dream-world/').replace(/\\.png$/, '.svg');  // -> Dream World
            }
          } else if (src.indexOf('/other/dream-world/') !== -1) {
            img.src = src.replace('/other/dream-world/', '/').replace(/\\.svg$/, '.png');   // -> game sprite
          } else {
            var di = img.getAttribute('data-default-img');                       // -> default form's image
            if (di && di !== src) { img.removeAttribute('data-default-img'); img.setAttribute('data-oa-retry', 0); img.src = di; }
          }
        }, true);
      </script>
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
        <div class="toolbar-row toolbar-forms">
          <label class="tag-filter"><input type="checkbox" id="species-filter" checked /><span>Species</span></label>
          <label class="tag-filter"><input type="checkbox" id="regional-filter" /><span>Regional forms</span></label>
          <label class="tag-filter"><input type="checkbox" id="battle-filter" /><span>Battle forms</span></label>
          <label class="tag-filter"><input type="checkbox" id="other-filter" /><span>Other forms</span></label>
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
              document.querySelectorAll(".selected-compare").forEach(el => el.classList.remove("selected-compare"));
              updateCompareBar();
            }
          });

          document.querySelectorAll(".pokemon-card").forEach(card => {
            card.addEventListener("click", function(e) {
              if (compareMode) {
                e.preventDefault();
                const id = this.dataset.id;
                const name = this.dataset.name;
                const existing = compareList.findIndex(p => p.id === id);
                if (existing !== -1) {
                  // Clicking an already-selected Pokémon deselects it.
                  compareList.splice(existing, 1);
                  this.classList.remove("selected-compare");
                  updateCompareBar();
                } else if (compareList.length < 2) {
                  compareList.push({ id, name });
                  this.classList.add("selected-compare");
                  updateCompareBar();
                }
              }
            });
          });

          function updateCompareBar() {
            compareSlot1.textContent = compareList[0]?.name || "Click 1st Pokémon";
            if (compareList.length === 1) {
              // Mirror the first pick as a faded hint: pressing Go now compares
              // the Pokémon with itself (to pit its forms against each other).
              compareSlot2.textContent = compareList[0].name;
              compareSlot2.classList.add("compare-slot-mirror");
            } else {
              compareSlot2.textContent = compareList[1]?.name || "Click 2nd Pokémon";
              compareSlot2.classList.remove("compare-slot-mirror");
            }
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
            if (compareList.length < 1) return;
            // With a single Pokémon selected, compare it against itself so its
            // forms can be pitted against each other via the per-side selectors.
            const id1 = compareList[0].id;
            const id2 = (compareList[1] || compareList[0]).id;
            compareResults.innerHTML = "<p>Loading...</p>";
            compareModal.style.display = "flex";

            const [pokemon1, pokemon2] = await Promise.all([
              fetch(\`https://pokeapi.co/api/v2/pokemon/\${id1}\`).then(r => r.json()),
              fetch(\`https://pokeapi.co/api/v2/pokemon/\${id2}\`).then(r => r.json()),
            ]);
            // Fetch species from each Pokémon's own species.url so form ids
            // (which have no pokemon-species/{id} endpoint) resolve correctly.
            const [species1, species2] = await Promise.all([
              fetch(pokemon1.species.url).then(r => r.json()),
              fetch(pokemon2.species.url).then(r => r.json()),
            ]);

            let currentP1 = pokemon1;
            let currentP2 = pokemon2;

            function formatFormName(name, baseName) {
              if (name === baseName) return baseName.charAt(0).toUpperCase() + baseName.slice(1);
              const formPart = name.startsWith(baseName + '-') ? name.slice(baseName.length + 1) : name;
              return formPart.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
            }

            function buildFormSelect(varieties, baseName, selectId, currentName) {
              if (varieties.length <= 1) return '';
              const options = varieties.map(v =>
                \`<option value="\${v.pokemon.url}" \${v.pokemon.name === currentName ? 'selected' : ''}>\${formatFormName(v.pokemon.name, baseName)}</option>\`
              ).join('');
              return \`<label style="font-size:13px;font-weight:bold;display:block;margin-top:6px;margin-bottom:4px;">Form</label><select id="\${selectId}" class="version-select">\${options}</select>\`;
            }

            function buildCompareTable(p1, p2) {
              const stats1 = p1.stats.reduce((acc, s) => { acc[s.stat.name] = s.base_stat; return acc; }, {});
              const stats2 = p2.stats.reduce((acc, s) => { acc[s.stat.name] = s.base_stat; return acc; }, {});
              const total1 = Object.values(stats1).reduce((a, b) => a + b, 0);
              const total2 = Object.values(stats2).reduce((a, b) => a + b, 0);
              const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
              let rows = statNames.map(stat => {
                const v1 = stats1[stat] || 0;
                const v2 = stats2[stat] || 0;
                const w1 = v1 > v2 ? 'winner' : v1 < v2 ? 'loser' : '';
                const w2 = v2 > v1 ? 'winner' : v2 < v1 ? 'loser' : '';
                const label = stat === 'hp' ? 'HP' : stat.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                return \`<tr><td class="\${w1}">\${v1}</td><td>\${label}</td><td class="\${w2}">\${v2}</td></tr>\`;
              }).join('');
              const tw1 = total1 > total2 ? 'winner' : total1 < total2 ? 'loser' : '';
              const tw2 = total2 > total1 ? 'winner' : total2 < total1 ? 'loser' : '';
              rows += \`<tr class="total-row"><td class="\${tw1}">\${total1}</td><td>TOTAL (BST)</td><td class="\${tw2}">\${total2}</td></tr>\`;
              return rows;
            }

            function updateTable() {
              const n1 = currentP1.name.charAt(0).toUpperCase() + currentP1.name.slice(1);
              const n2 = currentP2.name.charAt(0).toUpperCase() + currentP2.name.slice(1);
              document.querySelector('.compare-table thead tr').innerHTML = \`<th>\${n1}</th><th>Stat</th><th>\${n2}</th>\`;
              document.querySelector('.compare-table tbody').innerHTML = buildCompareTable(currentP1, currentP2);
            }

            const cry1 = pokemon1.cries?.latest || '';
            const cry2 = pokemon2.cries?.latest || '';
            const n1 = pokemon1.name.charAt(0).toUpperCase() + pokemon1.name.slice(1);
            const n2 = pokemon2.name.charAt(0).toUpperCase() + pokemon2.name.slice(1);

            compareResults.innerHTML = \`
              <div class="compare-header">
                <div class="compare-pokemon">
                  <img id="compare-img-1" src="\${pokemon1.sprites.other['official-artwork'].front_default || pokemon1.sprites.front_default}" alt="\${pokemon1.name}">
                  <h3>\${n1}</h3>
                  \${buildFormSelect(species1.varieties, species1.name, 'compare-form-1', pokemon1.name)}
                  \${cry1 ? \`<div class="compare-cry"><audio id="compare-cry-1" src="\${cry1}"></audio><button class="cry-button" onclick="const a=document.getElementById('compare-cry-1');a.currentTime=0;a.play();">🔊 Cry</button></div>\` : ''}
                </div>
                <div class="vs">VS</div>
                <div class="compare-pokemon">
                  <img id="compare-img-2" src="\${pokemon2.sprites.other['official-artwork'].front_default || pokemon2.sprites.front_default}" alt="\${pokemon2.name}">
                  <h3>\${n2}</h3>
                  \${buildFormSelect(species2.varieties, species2.name, 'compare-form-2', pokemon2.name)}
                  \${cry2 ? \`<div class="compare-cry"><audio id="compare-cry-2" src="\${cry2}"></audio><button class="cry-button" onclick="const a=document.getElementById('compare-cry-2');a.currentTime=0;a.play();">🔊 Cry</button></div>\` : ''}
                </div>
              </div>
              <table class="compare-table">
                <thead><tr><th>\${n1}</th><th>Stat</th><th>\${n2}</th></tr></thead>
                <tbody>\${buildCompareTable(pokemon1, pokemon2)}</tbody>
              </table>
            \`;

            const sel1 = document.getElementById('compare-form-1');
            if (sel1) {
              sel1.addEventListener('change', async function() {
                currentP1 = await fetch(this.value).then(r => r.json());
                document.getElementById('compare-img-1').src = currentP1.sprites.other['official-artwork'].front_default || currentP1.sprites.front_default;
                const cryEl = document.getElementById('compare-cry-1');
                if (cryEl && currentP1.cries?.latest) cryEl.src = currentP1.cries.latest;
                updateTable();
              });
            }
            const sel2 = document.getElementById('compare-form-2');
            if (sel2) {
              sel2.addEventListener('change', async function() {
                currentP2 = await fetch(this.value).then(r => r.json());
                document.getElementById('compare-img-2').src = currentP2.sprites.other['official-artwork'].front_default || currentP2.sprites.front_default;
                const cryEl = document.getElementById('compare-cry-2');
                if (cryEl && currentP2.cries?.latest) cryEl.src = currentP2.cries.latest;
                updateTable();
              });
            }
          });

          document.querySelector(".close-modal").addEventListener("click", function() {
            compareModal.style.display = "none";
          });

          compareModal.addEventListener("click", function(e) {
            if (e.target === compareModal) compareModal.style.display = "none";
          });

          // Baby/Legendary/Mythical are mutually exclusive (radio-like).
          const checkboxes = document.querySelectorAll('.toolbar-tags .tag-filter input[type="checkbox"]');
          checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
              checkboxes.forEach(box => {
                if (box !== checkbox) box.checked = false;
              });
              filterPokemons();
              saveFilters();
            });
          });
          // Category toggles (Species / Battle forms / Other forms) are complementary.
          document.querySelectorAll('.toolbar-forms input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function() {
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
              mythical: document.getElementById("mythical-filter").checked,
              species: document.getElementById("species-filter").checked,
              regional: document.getElementById("regional-filter").checked,
              battle: document.getElementById("battle-filter").checked,
              other: document.getElementById("other-filter").checked
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
              document.getElementById("species-filter").checked = filters.species !== false;
              document.getElementById("regional-filter").checked = filters.regional || false;
              document.getElementById("battle-filter").checked = filters.battle || false;
              document.getElementById("other-filter").checked = filters.other || false;
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
            // Complementary category toggles: base species, regional forms,
            // battle-only forms, and any other (cosmetic) forms.
            const showSpecies = document.getElementById("species-filter").checked;
            const showRegional = document.getElementById("regional-filter").checked;
            const showBattle = document.getElementById("battle-filter").checked;
            const showOther = document.getElementById("other-filter").checked;
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

              const kind = pokemonCard.classList.contains("form-variant") ? pokemonCard.dataset.formkind : "species";
              const categoryOn = (kind === "species" && showSpecies) || (kind === "regional" && showRegional) || (kind === "battle" && showBattle) || (kind === "other" && showOther);

              const visible = nameMatch && typeMatch && generationMatch && filterMatch && categoryOn;
              pokemonCard.parentElement.style.display = visible ? "block" : "none";
            });

            // Save filtered IDs for navigation in detail pages (base species only,
            // so prev/next behaves exactly as before — forms are excluded).
            const visibleIds = [];
            document.querySelectorAll(".pokemon-card:not(.form-variant)").forEach((card) => {
              if (card.parentElement.style.display !== "none") {
                visibleIds.push(parseInt(card.dataset.id));
              }
            });
            sessionStorage.setItem("filteredPokemonIds", JSON.stringify(visibleIds));

            // Show/hide clear button based on active filters (default category
            // is species only, so any deviation counts).
            const clearBtn = document.getElementById("clear-filters-btn");
            const hasFilters = searchText || selectedType || selectedGeneration || babyFilter || legendaryFilter || mythicalFilter || !showSpecies || showRegional || showBattle || showOther;
            clearBtn.style.display = hasFilters ? "inline-block" : "none";
          }
          
          function clearAllFilters() {
            document.getElementById("search-input").value = "";
            document.getElementById("type-select").value = "";
            document.getElementById("generation-select").value = "";
            document.getElementById("baby-filter").checked = false;
            document.getElementById("legendary-filter").checked = false;
            document.getElementById("mythical-filter").checked = false;
            document.getElementById("species-filter").checked = true;
            document.getElementById("regional-filter").checked = false;
            document.getElementById("battle-filter").checked = false;
            document.getElementById("other-filter").checked = false;
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
    
    const evoNodeAnchor = (evo: any): string => {
      // Gender branches share one dex id (Basculegion male + female), so only
      // the default-form node is highlighted on load; the client re-targets the
      // selected gender by data-hash.
      const isCurrentSpecies = evo.id === pokemon.id;
      return `
        <a href="${String(evo.id).padStart(4, '0')}_details.html${evo.hash ? `#${evo.hash}` : ''}" data-hash="${evo.hash || ''}" class="evo-step ${isCurrentSpecies && !evo.hash ? 'current' : ''}" ${isCurrentSpecies ? 'data-base="1"' : ''}>
          ${evo.hasForms ? `<span class="evo-forms-badge" title="Has other forms"${isCurrentSpecies ? ' style="display:none;"' : ''}>+</span>` : ''}
          <img src="${evo.imageUrl}" data-default-img="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png" alt="${evo.name}" />
          <span>${evo.name}</span>
        </a>`;
    };

    const battleSuffix = (formName: string): string =>
      formName.startsWith(pokemon.codename + '-') ? formName.slice(pokemon.codename.length + 1) : formName.split('-').slice(1).join('-');
    const evoBattleStep = (b: any): string => `
        <button type="button" class="evo-battle-step" data-url="https://pokeapi.co/api/v2/pokemon/${b.id}/" data-form="${battleSuffix(b.formName)}">
          <img src="${b.imageUrl}" alt="${b.name}" loading="lazy" />
          <span>${b.name}</span>
        </button>`;

    // A node's outgoing links are its evolutions (permanent, "→") and its
    // battle-only transformations (temporary, "↔"). When there's more than one,
    // they stack as branches so a battle form reads as an alternative to the
    // evolution — never as if it evolved into the next stage.
    const renderEvolutionStep = (evo: any, isFirst: boolean = false): string => {
      let html = '';
      if (!isFirst && (evo.triggerDetails || evo.regionLabel || evo.genderLabel)) {
        const capRegion = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        const parts: string[] = [];
        if (evo.triggerDetails) parts.push(evo.triggerDetails);
        if (evo.regionLabel) parts.push(`in ${capRegion(evo.regionLabel)}`);
        if (evo.genderLabel) parts.push(evo.genderLabel);
        html += `<div class="evo-arrow">→<span class="evo-trigger">${parts.join('<br>')}</span></div>`;
      }
      html += evoNodeAnchor(evo);

      const evos = evo.evolvesTo || [];
      const battles = evo.battleForms || [];
      // A battle-only branch: "↔" plus the transformation trigger (mega stone,
      // ability…) underneath, mirroring the "→" + trigger of an evolution.
      const battleArrow = (b: any) =>
        `<div class="evo-arrow evo-arrow-bi">↔${b.trigger ? `<span class="evo-trigger">${b.trigger}</span>` : ''}</div>`;

      // Single evolution, no battle form → keep the chain in one line.
      if (evos.length === 1 && battles.length === 0) {
        html += renderEvolutionStep(evos[0], false);
        return html;
      }
      // A single battle form (terminal node) → inline "↔" + trigger + form.
      if (evos.length === 0 && battles.length === 1) {
        html += battleArrow(battles[0]) + evoBattleStep(battles[0]);
        return html;
      }
      // Multiple outgoing links → stack them: evolutions with "→", battle forms
      // with "↔", each with its own trigger note.
      if (evos.length + battles.length > 1) {
        html += `<div class="evo-branch">`;
        html += evos.map((nextEvo: any) => `
            <div class="evo-branch-row">${renderEvolutionStep(nextEvo, false)}</div>`).join('');
        html += battles.map((b: any) => `
            <div class="evo-branch-row">${battleArrow(b)}${evoBattleStep(b)}</div>`).join('');
        html += `</div>`;
      }
      return html;
    };
    
    // The chain "key" a form belongs to: its region token (galar…), else its
    // suffix relative to the species codename (own-tempo…), else 'default'.
    // Mirrors the client-side chainKeyOf so selecting a form swaps to the row
    // built for it here.
    const keyOfForm = (formName: string, codename: string): string => {
      const suffix = formName.startsWith(codename + '-') ? formName.slice(codename.length + 1) : '';
      if (!suffix) return 'default';
      // Gender variants share the default chain (shown as branches, not a line).
      if (suffix === 'male' || suffix === 'female') return 'default';
      const segs = suffix.split('-');
      // Regional only when a region token LEADS the suffix (meowth-galar), not
      // when it appears later (raticate-totem-alola is a Totem form, not Alola).
      // Ash's Pikachu caps are named after regions but are never regional.
      if (!segs.includes('cap') && REGION_TOKENS.includes(segs[0])) return segs[0];
      return suffix;
    };
    // Which chain a path belongs to: prefer the base form it starts from (so
    // Own Tempo Rockruff → Dusk Lycanroc lives on the own-tempo chain, Galarian
    // Meowth → Perrserker on the galar chain), then the evolved form's region;
    // a plain evolution with no form data stays on the default line.
    const pathRegion = (p: any, codename: string): string => {
      if (p.baseForm) {
        const k = keyOfForm(p.baseForm, codename);
        if (k !== 'default') return k;
      }
      if (p.evolvedForm) {
        const er = regionOf(p.evolvedForm);
        if (er !== 'default') return er;
      }
      return 'default';
    };
    const variantForRegion = (node: any, region: string): any =>
      node.variants.find((v: any) => keyOfForm(v.formName, node.codename) === region) || node.variants.find((v: any) => v.formName === node.defaultFormName);
    const variantByForm = (node: any, formName: string): any =>
      node.variants.find((v: any) => v.formName === formName);
    const isGenderForm = (formName: string, codename: string): boolean => {
      const suffix = formName.startsWith(codename + '-') ? formName.slice(codename.length + 1) : '';
      return suffix === 'male' || suffix === 'female';
    };
    // Target variant(s) when evolved_form is unspecified: the region's (or
    // default) variety, or — if the target splits by gender (Basculin →
    // Basculegion male/female) — the default plus its gender siblings.
    const unspecifiedTargets = (node: any, region: string): any[] => {
      if ((node.variants || []).some((v: any) => isGenderForm(v.formName, node.codename))) {
        return node.variants.filter((v: any) =>
          v.formName === node.defaultFormName || isGenderForm(v.formName, node.codename));
      }
      const one = variantForRegion(node, region);
      return one ? [one] : [];
    };

    // Resolve the raw evolution tree into a concrete chain for a given region,
    // in the shape renderEvolutionStep expects. `displayVariant` is the specific
    // form this node is shown as. Each distinct evolved form within the region
    // becomes its own branch (so Kubfu shows both Urshifu, Rockruff all three
    // Lycanroc), while region forms drop out of the regions they don't apply to.
    const resolveRegion = (node: any, region: string, displayVariant: any, triggerDetails: string, chainRegions: Set<string>, extraVisible: Set<string> = new Set()): any => {
      const evolvesTo: any[] = [];
      let evolvingForm: string | null = null;  // form of THIS node an included path says evolves
      for (const edge of node.children) {
        const seen = new Map<string, { trigger: string; regionLabel: string }>();  // evolvedForm ('' = unspecified) → info
        for (const p of edge.paths) {
          const pr = pathRegion(p, node.codename);
          // A regional evolution whose region has no chain of its own (the base
          // species lacks that regional form, e.g. Pikachu → Alolan Raichu) is
          // shown on the default chain, tagged with the region under the arrow.
          const orphanRegional = region === 'default' && pr !== 'default' && !chainRegions.has(pr);
          if (pr !== region && !orphanRegional) continue;
          // base_form names which form of THIS node actually evolves (only
          // White-Striped Basculin → Basculegion); remember it so the node is
          // shown as that form even when reached from a descendant's chain.
          if (p.baseForm && p.baseForm !== node.defaultFormName && variantByForm(node, p.baseForm)) evolvingForm = p.baseForm;
          const key = p.evolvedForm || '';
          // Only tag a real region under the arrow ("in Alola"); a cosmetic base
          // form (White-Striped Basculin) is already shown as the base node.
          if (!seen.has(key)) seen.set(key, { trigger: p.trigger, regionLabel: orphanRegional && REGION_TOKENS.includes(pr) ? pr : '' });
        }
        for (const [evolvedForm, info] of seen) {
          const childVariants = (evolvedForm ? [variantByForm(edge.node, evolvedForm)] : unspecifiedTargets(edge.node, region)).filter(Boolean);
          // When several variants of the target are shown together (gender
          // branches), each should count the others as already on screen so it
          // doesn't badge a redundant "+" for a sibling form (or its battle form).
          const childExtra = new Set<string>();
          if (childVariants.length > 1) {
            for (const sv of childVariants) {
              childExtra.add(sv.formName);
              for (const b of (edge.node.battleForms || [])) if (b.baseForms.includes(sv.formName)) childExtra.add(b.formName);
            }
          }
          for (const childVariant of childVariants) {
            const child = resolveRegion(edge.node, region, childVariant, info.trigger, chainRegions, childExtra);
            child.regionLabel = info.regionLabel;
            // Gender-split targets (Basculin → male/female Basculegion) carry no
            // gender on the evolution itself, so tag each branch by its form.
            if (childVariants.length > 1) {
              const suffix = childVariant.formName.startsWith(edge.node.codename + '-') ? childVariant.formName.slice(edge.node.codename.length + 1) : '';
              child.genderLabel = suffix === 'female' ? 'Female' : 'Male';
            }
            evolvesTo.push(child);
          }
        }
      }
      // Show this node as the form that actually evolves when it's otherwise
      // displayed as its default (Basculegion's chain roots at White-Striped
      // Basculin, not the default Red-Striped).
      if (evolvingForm && displayVariant.formName === node.defaultFormName) {
        displayVariant = variantByForm(node, evolvingForm) || displayVariant;
      }
      const battleForms = (node.battleForms || [])
        .filter((b: any) => b.baseForms.includes(displayVariant.formName))
        .map((b: any) => ({ id: b.id, name: b.name, imageUrl: b.imageUrl, formName: b.formName, trigger: b.trigger }));
      // A persistent form pair (Minior meteor ↔ core) links to its counterpart
      // regardless of is_battle_only.
      if (displayVariant.transform) battleForms.push(displayVariant.transform);
      // Badge this node if its species has a variety not visible in this chain
      // (the shown variant, its "↔" battle forms, and any gender siblings shown
      // alongside). The renderer additionally hides it on the current Pokémon,
      // whose forms sit in the Forms list.
      const visible = new Set([displayVariant.formName, ...battleForms.map((b: any) => b.formName), ...extraVisible]);
      const hasForms = (node.allFormNames || []).some((n: string) => !visible.has(n));
      // Suffix (relative to this node's species codename) so the link can carry
      // the exact form and the target page opens in it; '' for the default form.
      const hash = displayVariant.formName === node.defaultFormName
        ? ''
        : (displayVariant.formName.startsWith(node.codename + '-') ? displayVariant.formName.slice(node.codename.length + 1) : displayVariant.formName.split('-').slice(1).join('-'));
      return { id: node.speciesId, name: displayVariant.name, imageUrl: displayVariant.imageUrl, hasForms, hash, triggerDetails, evolvesTo, battleForms };
    };
    const renderRegionChain = (region: string, chainRegions: Set<string>): string => {
      if (!pokemon.evolutionChain) return '<p class="no-evolution">This Pokémon does not evolve.</p>';
      const root = resolveRegion(pokemon.evolutionChain, region, variantForRegion(pokemon.evolutionChain, region), '', chainRegions);
      // Render whenever there's something to show — an evolution or a battle-only
      // transformation hanging off the root (e.g. Zygarde ↔ Mega, no evolution).
      return root.evolvesTo.length === 0 && root.battleForms.length === 0
        ? '<p class="no-evolution">This Pokémon does not evolve.</p>'
        : renderEvolutionStep(root, true);
    };

    // A plain cosmetic form (Gimmighoul Roaming) shares only an *unrestricted*
    // species evolution — a base_form on the path (Pikachu → Raichu is
    // default-only) keeps caps a dead end. Rooted at this species (not the chain
    // root), so an upstream stage (Pichu → Pikachu) never leaks in.
    const resolveCosmetic = (node: any, displayVariant: any, chainRegions: Set<string>): any => {
      const evolvesTo: any[] = [];
      for (const edge of node.children) {
        const seen = new Map<string, string>();  // evolvedForm ('' = unspecified) → trigger
        for (const p of edge.paths) {
          if (p.baseForm) continue;  // restricted evolution: doesn't apply to this form
          const key = p.evolvedForm || '';
          if (!seen.has(key)) seen.set(key, p.trigger);
        }
        for (const [evolvedForm, trigger] of seen) {
          const childVariant = evolvedForm ? variantByForm(edge.node, evolvedForm) : variantForRegion(edge.node, 'default');
          if (!childVariant) continue;
          evolvesTo.push(resolveRegion(edge.node, 'default', childVariant, trigger, chainRegions));
        }
      }
      const battleForms = (node.battleForms || [])
        .filter((b: any) => b.baseForms.includes(displayVariant.formName))
        .map((b: any) => ({ id: b.id, name: b.name, imageUrl: b.imageUrl, formName: b.formName, trigger: b.trigger }));
      if (displayVariant.transform) battleForms.push(displayVariant.transform);
      const visible = new Set([displayVariant.formName, ...battleForms.map((b: any) => b.formName)]);
      const hasForms = (node.allFormNames || []).some((n: string) => !visible.has(n));
      const hash = displayVariant.formName === node.defaultFormName
        ? ''
        : (displayVariant.formName.startsWith(node.codename + '-') ? displayVariant.formName.slice(node.codename.length + 1) : displayVariant.formName.split('-').slice(1).join('-'));
      return { id: node.speciesId, name: displayVariant.name, imageUrl: displayVariant.imageUrl, hasForms, hash, triggerDetails: '', evolvesTo, battleForms };
    };

    // One chain per region the current species actually has a form for — read
    // straight from the (data-derived) evolution tree, so no region list to
    // maintain. The default is shown first and loadForm() swaps to the others.
    const findEvoNode = (node: any, id: number): any => {
      if (!node) return null;
      if (node.speciesId === id) return node;
      for (const e of node.children) {
        const found = findEvoNode(e.node, id);
        if (found) return found;
      }
      return null;
    };
    const currentEvoNode = findEvoNode(pokemon.evolutionChain, pokemon.id);

    // Battle-only forms move out of the Forms list into the chain; regional
    // variants (incl. default) already have their own region chains.
    const battleOnlyNames: Set<string> = new Set(currentEvoNode ? currentEvoNode.battleForms.map((b: any) => b.formName) : []);
    // Base forms already covered by a region chain (default + regional variants);
    // any other base form of a battle-only transform (e.g. Battle Bond, Power
    // Construct) gets its own standalone chain instead.
    const regionalFormNames: string[] = currentEvoNode
      ? currentEvoNode.variants.filter((v: any) => v.region !== 'default' || v.formName === currentEvoNode.defaultFormName).map((v: any) => v.formName)
      : [];

    // A special base form (e.g. Greninja Battle Bond, Zygarde Power Construct, a
    // Minior core) is a non-default, non-regional form that hosts a battle-only
    // transform. It gets its own standalone chain: [that form] ↔ [its battle form(s)].
    // Gender forms are excluded: they already appear as branches on the default
    // chain (with their own battle form), so a standalone row would duplicate them.
    const specialBaseForms: string[] = [];
    if (currentEvoNode) {
      const seen = new Set<string>();
      for (const b of currentEvoNode.battleForms) {
        for (const bf of b.baseForms) {
          if (!regionalFormNames.includes(bf) && !isGenderForm(bf, currentEvoNode.codename) && !seen.has(bf)) { seen.add(bf); specialBaseForms.push(bf); }
        }
      }
    }

    // Region rows cover the default form and every other variant EXCEPT the ones
    // already rendered elsewhere: the default form itself (the 'default' row) and
    // special base forms (their own standalone rows below). Emitting them here too
    // would produce a duplicate row — and, in a multi-stage chain, an empty one,
    // since resolveRegion filters the chain-root's paths by a key it can't match.
    const defaultKey = currentEvoNode ? keyOfForm(currentEvoNode.defaultFormName, currentEvoNode.codename) : 'default';
    const specialBaseKeys = new Set<string>(specialBaseForms.map((bf) => keyOfForm(bf, currentEvoNode.codename)));
    const evoRegions: string[] = currentEvoNode
      ? ['default', ...Array.from(new Set<string>(currentEvoNode.variants.map((v: any) => keyOfForm(v.formName, currentEvoNode.codename)))).filter((r) => r !== 'default' && r !== defaultKey && !specialBaseKeys.has(r))]
      : ['default'];
    const chainRegions = new Set<string>(evoRegions);

    // Every region key some path in the chain actually resolves to (regional
    // forms, and form-locked lines like Own Tempo Rockruff → Dusk Lycanroc). A
    // variant whose key is NOT here has no chain of its own.
    const pathRegionsInChain = new Set<string>();
    const collectPathRegions = (node: any) => {
      for (const edge of node.children) {
        for (const p of edge.paths) pathRegionsInChain.add(pathRegion(p, node.codename));
        collectPathRegions(edge.node);
      }
    };
    if (pokemon.evolutionChain) collectPathRegions(pokemon.evolutionChain);

    // A non-regional key with no path of its own (Gimmighoul Roaming): its
    // region row would be empty, so resolveCosmetic handles it instead.
    const cosmeticInheritRegion = (region: string): boolean =>
      region !== 'default' && !REGION_TOKENS.includes(region) && !pathRegionsInChain.has(region);
    const regionRowsHtml = evoRegions.map(region => {
      const cosmeticVar = cosmeticInheritRegion(region) && currentEvoNode
        ? currentEvoNode.variants.find((v: any) => keyOfForm(v.formName, currentEvoNode.codename) === region)
        : null;
      let body: string;
      if (cosmeticVar) {
        const root = resolveCosmetic(currentEvoNode, cosmeticVar, chainRegions);
        body = root.evolvesTo.length === 0 && root.battleForms.length === 0
          ? '<p class="no-evolution">This Pokémon does not evolve.</p>'
          : renderEvolutionStep(root, true);
      } else {
        body = renderRegionChain(region, chainRegions);
      }
      return `<div class="evo-row" data-region="${region}"${region === 'default' ? '' : ' style="display:none;"'}>${body}</div>`;
    }).join('\n');

    // Chain-building helpers shared below.
    const evoSuffixOf = (name: string): string =>
      name.startsWith(pokemon.codename + '-') ? name.slice(pokemon.codename.length + 1) : name.split('-').slice(1).join('-');
    const evoTitleCase = (s: string): string => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const evoArtwork = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

    const varietyIdByName: { [k: string]: number } = {};
    for (const v of pokemon.varieties) varietyIdByName[v.name] = parseInt(v.url.split('/').filter(Boolean).pop() as string);
    const specialRowsHtml = specialBaseForms.map((baseFormName: string) => {
      const attached = currentEvoNode.battleForms
        .filter((b: any) => b.baseForms.includes(baseFormName))
        .map((b: any) => ({ id: b.id, name: b.name, imageUrl: b.imageUrl, formName: b.formName, trigger: b.trigger }));
      const root = {
        id: pokemon.id,
        name: `${pokemon.name} (${evoTitleCase(evoSuffixOf(baseFormName))})`,
        imageUrl: evoArtwork(varietyIdByName[baseFormName]),
        hasForms: false,
        // The node's own anchor links here (#suffix) so you can return to this
        // base form from its battle-only form; without it the link drops the
        // hash and lands on the default form.
        hash: evoSuffixOf(baseFormName),
        region: evoSuffixOf(baseFormName),
        triggerDetails: '',
        evolvesTo: [],
        battleForms: attached,
      };
      return `<div class="evo-row" data-region="${evoSuffixOf(baseFormName)}" style="display:none;">${renderEvolutionStep(root, true)}</div>`;
    }).join('\n');

    const evolutionRowsHtml = regionRowsHtml + '\n' + specialRowsHtml;

    // The Forms list keeps default + regional + special forms, but not the
    // battle-only ones (now in the chain).
    const clusterVarieties = pokemon.varieties.filter(v => !battleOnlyNames.has(v.name));
    
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

    const formOptions = clusterVarieties.map(v => {
      const baseName = pokemon.codename;
      let displayName: string;
      if (v.name === baseName) {
        displayName = pokemon.name;
      } else {
        const formPart = v.name.startsWith(baseName + '-') ? v.name.slice(baseName.length + 1) : v.name;
        displayName = formPart.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      return `<option value="${v.url}" ${v.is_default ? 'selected' : ''}>${displayName}</option>`;
    }).join('\n');

    // Clickable form squares shown below the evolution chain (battle-only forms
    // are excluded — they live in the chain). The artwork URL is built straight
    // from the variety id (no extra fetch needed).
    const formSquares = clusterVarieties.length > 1 ? `
          <div class="forms-cluster">
            <span class="forms-label">Forms</span>
            <div class="forms-list">
              ${clusterVarieties.map(v => {
                const formId = v.url.split('/').filter(Boolean).pop();
                const artwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${formId}.png`;
                const baseName = pokemon.codename;
                let label: string;
                if (v.name === baseName) {
                  label = pokemon.name;
                } else {
                  const formPart = v.name.startsWith(baseName + '-') ? v.name.slice(baseName.length + 1) : v.name;
                  label = formPart.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                }
                return `<button type="button" class="form-step ${v.is_default ? 'active' : ''}" data-url="${v.url}" data-region="${evoSuffixOf(v.name)}">
                  <img src="${artwork}" data-default-img="${pokemon.officialArtworkUrl}" alt="${label}" loading="lazy" />
                  <span>${label}</span>
                </button>`;
              }).join('')}
            </div>
          </div>` : '';

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
          <a href="index.html" class="back-to-menu"><i class="fas fa-arrow-left"></i></a> <span id="pokemon-title-name">${pokemon.name}</span> <span class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</span>
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
              <button id="shiny-toggle" class="shiny-toggle" title="Toggle Shiny"${pokemon.officialArtworkShinyUrl ? '' : ' style="display:none;"'}>✨ Shiny</button>
              ${pokemon.animatedSpriteUrl ? `<button id="animated-toggle" class="animated-toggle" title="Toggle Animated Sprite">🎬 Animated</button>` : ''}
              ${pokemon.cryUrl ? `<button id="cry-button" class="cry-button" title="Play Cry">🔊 Cry</button>` : ''}
            </div>
            ${pokemon.cryUrl ? `<audio id="pokemon-cry" src="${pokemon.cryUrl}"></audio>` : ''}
            ${clusterVarieties.length > 1 ? `
            <div class="version-container" style="margin-top: 10px;">
              <label style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 4px;">Form</label>
              <select id="form-select" class="version-select">
                ${formOptions}
              </select>
            </div>` : ''}
          </div>
          <div class="info-tables">
            <table class="combat-table">
              <tr><th colspan="2" class="section-title-cell">⚔️ Combat Info</th></tr>
              <tr><td class="attribute">Type:</td><td class="value" id="pokemon-types">${types}</td></tr>
              <tr><td class="attribute" title="Takes 4x damage">Super Weak (4x):</td><td class="value" id="pokemon-super-weak-to">${superWeakTo || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 2x damage">Weak (2x):</td><td class="value" id="pokemon-weak-to">${weakTo || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 1x damage">Normal (1x):</td><td class="value" id="pokemon-normal">${normal || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 0.5x damage">Resistant (½x):</td><td class="value" id="pokemon-resistant-to">${resistantTo || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 0.25x damage">Super Resist (¼x):</td><td class="value" id="pokemon-super-resistant-to">${superResistantTo || '-'}</td></tr>
              <tr><td class="attribute" title="Takes 0x damage">Immune (0x):</td><td class="value" id="pokemon-immune-to">${immuneTo || '-'}</td></tr>
            </table>
            <table class="details-table">
              <tr><th colspan="2" class="section-title-cell">📋 Details</th></tr>
              <tr><td class="attribute">Generation:</td><td class="value"><span class="gen-badge">${generationDisplay}</span></td></tr>
              <tr><td class="attribute">Height:</td><td class="value" id="pokemon-height">${heightInMeters}</td></tr>
              <tr><td class="attribute">Weight:</td><td class="value" id="pokemon-weight">${weightInKilograms}</td></tr>
              <tr><td class="attribute" title="Chance of being female">Gender:</td><td class="value">${getGenderDisplay(pokemon.genderRate)}</td></tr>
              <tr id="detail-habitat"><td class="attribute">Habitat:</td><td class="value">${habitatDisplay}</td></tr>
              <tr id="detail-egg-groups"><td class="attribute" title="For breeding">Egg Groups:</td><td class="value">${pokemon.eggGroups.map(eg => eg.charAt(0).toUpperCase() + eg.slice(1)).join(', ') || '-'}</td></tr>
              <tr id="detail-catch-rate"><td class="attribute" title="Higher = easier to catch">Catch Rate:</td><td class="value">${getCatchRateBar(pokemon.captureRate)}</td></tr>
              <tr id="detail-base-happiness"><td class="attribute" title="Initial happiness">Base Happiness:</td><td class="value">${pokemon.baseHappiness} ${pokemon.baseHappiness >= 140 ? '😊' : pokemon.baseHappiness >= 70 ? '🙂' : '😐'}</td></tr>
              <tr id="detail-growth-rate"><td class="attribute" title="Leveling speed">Growth Rate:</td><td class="value">${pokemon.growthRate.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td></tr>
            </table>
          </div>
        </div>
        <h2 class="section-title">Evolution Chain</h2>
        <div class="evolution-chain">
          ${evolutionRowsHtml}
          ${formSquares}
        </div>
        <div class="table-container">
          <table class="abilities-table">
            <tr>
              <th colspan="2" class="section-title-cell">Pokémon Abilities</th>
            </tr>
            <tbody id="abilities-body">
            ${abilitiesTableRows}
            </tbody>
          </table>
          <table>
            <tr>
              <th colspan="3" class="section-title-cell">Pokémon Stats</th>
            </tr>
            <tbody id="stats-body">
            ${statsTableRows}
            </tbody>
            <tr class="bst-row">
              <td class="attribute abilities-text">Base Stat Total:</td>
              <td class="value abilities-text bst-value" colspan="2" id="pokemon-bst">${bst}</td>
            </tr>
          </table>
        </div>
        <div id="pokedex-section"${pokemon.pokedexDescriptions.length === 0 ? ' style="display:none;"' : ''}>
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

            // Rebuild the Pokédex Description section for a set of entries. A
            // non-default form shows its own entries (empty -> section hidden);
            // the default form shows the species' (SPECIES_DESCRIPTIONS).
            function cleanFlavorText(t) {
              return String(t).replace(/\\s+/g, ' ').trim();
            }
            function renderDescriptions(descs) {
              const section = document.getElementById("pokedex-section");
              const select = document.getElementById("version-select");
              const container = document.querySelector(".description-container");
              if (!section || !select || !container) return;
              if (!descs || descs.length === 0) { section.style.display = "none"; return; }
              section.style.display = "";
              const cap = function(s) { return s.charAt(0).toUpperCase() + s.slice(1); };
              select.innerHTML = descs.map(function(d) { return '<option value="' + d.version + '" class="tag">' + cap(d.version) + '</option>'; }).join('');
              container.innerHTML = descs.map(function(d, i) { return '<p class="description" data-version="' + d.version + '"' + (i !== 0 ? ' style="display:none;"' : '') + '>' + cleanFlavorText(d.flavor_text) + '</p>'; }).join('');
            }

            // Form selector — the dropdown and the clickable form squares are two
            // views of the same control, kept in sync through selectForm().
            const formSelect = document.getElementById("form-select");
            const formSteps = Array.prototype.slice.call(document.querySelectorAll(".form-step"));
            function markActiveForm(url) {
              formSteps.forEach(function(s) { s.classList.toggle("active", s.dataset.url === url); });
            }
            async function selectForm(url) {
              if (formSelect) formSelect.value = url;
              markActiveForm(url);
              await loadForm(url);
            }
            if (formSelect) {
              formSelect.addEventListener("change", function() { selectForm(this.value); });
            }
            formSteps.forEach(function(step) {
              step.addEventListener("click", function() { selectForm(this.dataset.url); });
            });
            // Battle-only forms live inside the chain; clicking switches the view
            // to that form but keeps the current chain (you're already in it).
            Array.prototype.slice.call(document.querySelectorAll(".evo-battle-step")).forEach(function(step) {
              // Route through the URL hash so switching away and back (e.g. to the
              // base form, whose chain node is a #hash link) always fires, and so
              // battle-only forms are linkable/refresh-safe.
              step.addEventListener("click", function() { location.hash = this.dataset.form; });
            });

            // Form selection is driven by the URL hash so it survives refresh, is
            // linkable, and — crucially — lets you switch to a battle-only form and
            // back to its base form (whose chain node is a #hash link, not a button).
            // Empty hash = the default form; a form-step's region key = a base/
            // regional/special form; a battle step's data-form = a battle-only form.
            const BASE_URL = "https://pokeapi.co/api/v2/pokemon/${pokemon.id}/";
            function applyHash() {
              const hashForm = location.hash.slice(1);
              if (!hashForm) { selectForm(BASE_URL); return; }
              const step = formSteps.filter(function(s) { return s.dataset.region === hashForm; })[0];
              if (step) { selectForm(step.dataset.url); return; }
              const battle = Array.prototype.slice.call(document.querySelectorAll(".evo-battle-step"))
                .filter(function(s) { return s.dataset.form === hashForm; })[0];
              if (battle) {
                // Reveal the chain the battle form lives in, then switch to it.
                const row = battle.closest(".evo-row");
                if (row) {
                  Array.prototype.slice.call(document.querySelectorAll(".evo-row")).forEach(function(r) { r.style.display = "none"; });
                  row.style.display = "";
                }
                loadForm(battle.dataset.url, false);
              }
            }
            window.addEventListener("hashchange", applyHash);
            // On first load act only if a form was requested; an empty hash is the
            // default form, which the page is already rendered as.
            if (location.hash.slice(1)) applyHash();

            function getStatBarHtml(value, maxValue) {
              const percentage = Math.round((value / maxValue) * 100);
              let backgroundColor;
              if (percentage >= 35) backgroundColor = 'limegreen';
              else if (percentage >= 20) backgroundColor = 'gold';
              else backgroundColor = 'tomato';
              return \`<div class="stat-bar-container"><div class="stat-bar"><div class="stat-value" style="width: \${percentage}%; background-color: \${backgroundColor};"></div></div></div>\`;
            }

            async function getTypeWeaknesses(types) {
              const allTypes = ${JSON.stringify(ALL_TYPES)};
              const multipliers = {};
              for (const type of types) {
                const res = await fetch(\`https://pokeapi.co/api/v2/type/\${type}\`);
                const data = await res.json();
                data.damage_relations.double_damage_from.forEach(t => { multipliers[t.name] = (multipliers[t.name] || 1) * 2; });
                data.damage_relations.half_damage_from.forEach(t => { multipliers[t.name] = (multipliers[t.name] || 1) * 0.5; });
                data.damage_relations.no_damage_from.forEach(t => { multipliers[t.name] = 0; });
              }
              const result = { superWeakTo: [], weakTo: [], normal: [], resistantTo: [], superResistantTo: [], immuneTo: [] };
              for (const type of allTypes) {
                const m = multipliers[type];
                if (m === 0) result.immuneTo.push(type);
                else if (m === 4) result.superWeakTo.push(type);
                else if (m === 2) result.weakTo.push(type);
                else if (m === 0.5) result.resistantTo.push(type);
                else if (m === 0.25) result.superResistantTo.push(type);
                else result.normal.push(type);
              }
              return result;
            }

            function renderTags(types) {
              return types.map(t => \`<span class="tag \${t}">\${t}</span>\`).join(' ') || '-';
            }

            const BASE_NAME = ${JSON.stringify(pokemon.name)};
            const BASE_CODENAME = ${JSON.stringify(pokemon.codename)};
            const DEFAULT_IMG = ${JSON.stringify(pokemon.officialArtworkUrl)};
            // Species-level Pokédex entries (shown for the default form; a form's
            // own entries, when it has any, replace these — see loadForm).
            const SPECIES_DESCRIPTIONS = ${JSON.stringify(pokemon.pokedexDescriptions)};
            const REGION_TOKENS = ${JSON.stringify(REGION_TOKENS)};
            // Which evolution-chain row a form belongs to (mirrors the
            // server-side keyOfForm): a region token LEADING the suffix keys a
            // regional chain (meowth-galar), otherwise the full suffix is the
            // key (a cosmetic/special form like Battle Bond or Totem), falling
            // back to the default chain. A region token later in the name is
            // incidental (raticate-totem-alola is a Totem form, not Alola), and
            // Ash's Pikachu caps are never regional.
            function chainKeyOf(formName) {
              const suffix = formName.indexOf(BASE_CODENAME + "-") === 0 ? formName.slice(BASE_CODENAME.length + 1) : "";
              if (!suffix) return "default";
              if (suffix === "male" || suffix === "female") return "default";
              const segs = suffix.split("-");
              if (segs.indexOf("cap") < 0 && REGION_TOKENS.indexOf(segs[0]) >= 0) return segs[0];
              return suffix;
            }
            function formTitle(formCodename) {
              if (formCodename === BASE_CODENAME) return BASE_NAME;
              const part = formCodename.startsWith(BASE_CODENAME + '-') ? formCodename.slice(BASE_CODENAME.length + 1) : formCodename;
              const formLabel = part.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
              return BASE_NAME + ' (' + formLabel + ')';
            }

            async function loadForm(url, swapChain) {
              if (swapChain === undefined) swapChain = true;
              const res = await fetch(url);
              const data = await res.json();

              // Artwork: official artwork -> Dream World -> game sprite -> the
              // default form's image (some variants have no image of their own).
              const dreamUrl = data.sprites.other['dream_world'] && data.sprites.other['dream_world'].front_default;
              const normalUrl = data.sprites.other['official-artwork'].front_default || dreamUrl || data.sprites.front_default || DEFAULT_IMG;
              // Shiny official artwork, else the shiny sprite; empty = no shiny.
              const shinyUrl = data.sprites.other['official-artwork'].front_shiny || data.sprites.front_shiny || '';
              const animatedUrl = data.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default || '';
              const artwork = document.getElementById("pokemon-artwork");
              artwork.src = normalUrl;
              artwork.dataset.normal = normalUrl;
              artwork.dataset.shiny = shinyUrl;
              artwork.dataset.animated = animatedUrl;
              isShiny = false;
              isAnimated = false;
              const shinyToggleBtn = document.getElementById("shiny-toggle");
              // Hide the Shiny toggle for forms with no shiny artwork/sprite.
              if (shinyToggleBtn) { shinyToggleBtn.classList.remove("active"); shinyToggleBtn.textContent = "✨ Shiny"; shinyToggleBtn.style.display = shinyUrl ? "" : "none"; }

              // Title
              const titleEl = document.getElementById("pokemon-title-name");
              if (titleEl) titleEl.textContent = formTitle(data.name);

              // Animated sprite toggle availability
              let animBtn = document.getElementById("animated-toggle");
              if (animatedUrl) {
                if (!animBtn) {
                  const imageControls = document.querySelector(".image-controls");
                  animBtn = document.createElement("button");
                  animBtn.id = "animated-toggle";
                  animBtn.className = "animated-toggle";
                  animBtn.title = "Toggle Animated Sprite";
                  animBtn.textContent = "🎬 Animated";
                  const cryBtnRef = document.getElementById("cry-button");
                  if (cryBtnRef) imageControls.insertBefore(animBtn, cryBtnRef);
                  else imageControls.appendChild(animBtn);
                  animBtn.addEventListener("click", function() {
                    isAnimated = !isAnimated;
                    isShiny = false;
                    shinyToggle.classList.remove("active");
                    shinyToggle.textContent = "✨ Shiny";
                    pokemonArtwork.src = isAnimated ? pokemonArtwork.dataset.animated : pokemonArtwork.dataset.normal;
                    animBtn.classList.toggle("active", isAnimated);
                    animBtn.textContent = isAnimated ? "🎬 Static" : "🎬 Animated";
                  });
                }
                animBtn.classList.remove("active");
                animBtn.textContent = "🎬 Animated";
                animBtn.style.display = "";
              } else if (animBtn) {
                animBtn.style.display = "none";
              }

              // Cry
              const formCry = data.cries?.latest || '';
              const existingCryAudio = document.getElementById("pokemon-cry");
              const existingCryBtn = document.getElementById("cry-button");
              if (existingCryAudio) {
                // Base form already wired up the audio + listener; just swap the source.
                if (formCry) {
                  existingCryAudio.src = formCry;
                  if (existingCryBtn) existingCryBtn.style.display = "";
                } else {
                  existingCryAudio.removeAttribute("src");
                  if (existingCryBtn) existingCryBtn.style.display = "none";
                }
              } else if (formCry) {
                // Base form had no cry; create the elements on the fly.
                const imageControls = document.querySelector(".image-controls");
                const newAudio = document.createElement("audio");
                newAudio.id = "pokemon-cry";
                newAudio.src = formCry;
                imageControls.parentNode.appendChild(newAudio);
                const newBtn = document.createElement("button");
                newBtn.id = "cry-button";
                newBtn.className = "cry-button";
                newBtn.title = "Play Cry";
                newBtn.textContent = "🔊 Cry";
                newBtn.addEventListener("click", function() { newAudio.currentTime = 0; newAudio.play(); });
                imageControls.appendChild(newBtn);
              }

              // Height / weight
              document.getElementById("pokemon-height").textContent = (data.height / 10).toFixed(1) + " m";
              document.getElementById("pokemon-weight").textContent = (data.weight / 10).toFixed(1) + " kg";

              // Types
              const types = data.types.map(t => t.type.name);
              document.getElementById("pokemon-types").innerHTML = renderTags(types);

              // Type weaknesses
              const weaknesses = await getTypeWeaknesses(types);
              document.getElementById("pokemon-super-weak-to").innerHTML = renderTags(weaknesses.superWeakTo);
              document.getElementById("pokemon-weak-to").innerHTML = renderTags(weaknesses.weakTo);
              document.getElementById("pokemon-normal").innerHTML = renderTags(weaknesses.normal);
              document.getElementById("pokemon-resistant-to").innerHTML = renderTags(weaknesses.resistantTo);
              document.getElementById("pokemon-super-resistant-to").innerHTML = renderTags(weaknesses.superResistantTo);
              document.getElementById("pokemon-immune-to").innerHTML = renderTags(weaknesses.immuneTo);

              // Abilities
              const abilitiesHtml = await Promise.all(data.abilities.map(async a => {
                const aRes = await fetch(a.ability.url);
                const aData = await aRes.json();
                const entry = aData.effect_entries.find(e => e.language.name === 'en');
                const description = entry ? entry.effect : 'No description available';
                const hiddenTag = a.is_hidden ? '<span class="hidden-ability">hidden</span>' : '';
                const name = a.ability.name.charAt(0).toUpperCase() + a.ability.name.slice(1);
                return \`<tr><td class="attribute abilities-text">\${name}: \${hiddenTag}</td><td class="value abilities-text">\${description}</td></tr>\`;
              }));
              document.getElementById("abilities-body").innerHTML = abilitiesHtml.join('');

              // Stats
              const stats = data.stats.map(s => ({ name: s.stat.name, value: s.base_stat }));
              const bst = stats.reduce((sum, s) => sum + s.value, 0);
              document.getElementById("stats-body").innerHTML = stats.map(s => {
                const label = s.name === 'hp' ? 'HP' : s.name.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                return \`<tr><td class="attribute abilities-text">\${label}:</td><td class="value abilities-text">\${s.value}</td><td class="value abilities-bar">\${getStatBarHtml(s.value, 255)}</td></tr>\`;
              }).join('');
              document.getElementById("pokemon-bst").textContent = bst;

              // Species-level details don't apply to battle-only forms (Mega/Gmax):
              // they can't be caught or bred, so hide those rows for such forms.
              let isBattleOnly = false;
              let formData = null;
              try {
                const formRes = await fetch(data.forms[0].url);
                formData = await formRes.json();
                isBattleOnly = !!formData.is_battle_only;
              } catch (e) { /* keep rows visible if the form lookup fails */ }
              // Pokédex entries: the default form shows the species' entries; a
              // non-default form shows only its own (reusing formData, already
              // fetched above) — and the section is hidden when it has none.
              if (data.is_default) {
                renderDescriptions(SPECIES_DESCRIPTIONS);
              } else {
                const formEntries = ((formData && formData.flavor_text_entries) || [])
                  .filter(function(e) { return e.language && e.language.name === 'en'; })
                  .map(function(e) { return { version: e.version.name, flavor_text: e.flavor_text }; });
                renderDescriptions(formEntries);
              }
              ["detail-catch-rate", "detail-habitat", "detail-egg-groups", "detail-base-happiness", "detail-growth-rate"].forEach(id => {
                const row = document.getElementById(id);
                if (row) row.style.display = isBattleOnly ? "none" : "";
              });
              // The Forms list picks base/regional forms; hide it while viewing a
              // battle-only transformation (it's reached from the chain, not here).
              const formsCluster = document.querySelector(".forms-cluster");
              if (formsCluster) formsCluster.style.display = isBattleOnly ? "none" : "";

              // Swap to the evolution chain matching this form (only for primary
              // form selection, not battle-only clicks — you're already in the
              // right chain then). A regional form maps to its region chain; a
              // special form (Battle Bond, Power Construct) to its own; the rest
              // to the default chain.
              if (swapChain) {
                const key = chainKeyOf(data.name);
                const rows = Array.prototype.slice.call(document.querySelectorAll(".evo-row"));
                const target = rows.filter(r => r.dataset.region === key)[0]
                  || rows.filter(r => r.dataset.region === "default")[0] || rows[0];
                rows.forEach(r => { r.style.display = "none"; });
                if (target) target.style.display = "";
              }

              // Move the "current" highlight to the form now shown: its battle
              // step if this is a battle-only form, otherwise the base node.
              const visibleRow = Array.prototype.slice.call(document.querySelectorAll(".evo-row")).filter(r => r.style.display !== "none")[0];
              if (visibleRow) {
                Array.prototype.slice.call(visibleRow.querySelectorAll(".current")).forEach(el => el.classList.remove("current"));
                const battle = visibleRow.querySelector('.evo-battle-step[data-url="' + url + '"]');
                // Gender siblings share one chain, so highlight the exact form
                // node (by its hash) when there is one, else the base species node.
                const suffix = data.name.indexOf(BASE_CODENAME + "-") === 0 ? data.name.slice(BASE_CODENAME.length + 1) : "";
                const formNode = suffix ? visibleRow.querySelector('.evo-step[data-hash="' + suffix + '"]') : null;
                const base = formNode || visibleRow.querySelector('.evo-step[data-base="1"]');
                if (battle) battle.classList.add("current");
                else if (base) base.classList.add("current");
                // The base node's "+" is hidden while its forms are reachable in
                // the Forms list; show it once that list is hidden (battle-only
                // view), since its other forms are no longer visible anywhere.
                const baseBadge = base && base.querySelector(".evo-forms-badge");
                if (baseBadge) baseBadge.style.display = isBattleOnly ? "" : "none";
              }
            }
          });
        </script>
      </body>
    </html>`;
  }  

// The type list itself comes from the API (see types.ts); colours have no API
// source, so this palette stays hand-maintained and falls back to grey.
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
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
  <script>
    // On image error, retry the official artwork a few times (transient github
    // hiccups) before falling back to Dream World, then the sprite. In <head>,
    // capture phase, to catch images that load before the main scripts run.
    document.addEventListener('error', function (ev) {
      var img = ev.target;
      if (!img || img.tagName !== 'IMG') return;
      var src = img.src.split('?')[0];
      if (src.indexOf('/other/official-artwork/') !== -1) {
        // Retry official artwork a few times (transient github hiccups), then step down.
        var tries = +(img.getAttribute('data-oa-retry') || 0);
        if (tries < 3) {
          img.setAttribute('data-oa-retry', tries + 1);
          setTimeout(function () { img.src = src + '?r=' + (tries + 1); }, 300 * (tries + 1));
        } else if (src.indexOf('/official-artwork/shiny/') !== -1) {
          img.src = src.replace('/other/official-artwork/', '/');            // shiny: no Dream World, go to shiny sprite
        } else {
          img.src = src.replace('/other/official-artwork/', '/other/dream-world/').replace(/\\.png$/, '.svg');  // -> Dream World
        }
      } else if (src.indexOf('/other/dream-world/') !== -1) {
        img.src = src.replace('/other/dream-world/', '/').replace(/\\.svg$/, '.png');   // -> game sprite
      } else {
        var di = img.getAttribute('data-default-img');                       // sprite failed too -> the default form's image
        if (di && di !== src) { img.removeAttribute('data-default-img'); img.setAttribute('data-oa-retry', 0); img.src = di; }
      }
    }, true);
  </script>
</head>`;
}

async function generateSite() {
  // Region tokens and the type list are fetched from the API up front so the
  // rendered pages (and the injected client-side lists) don't hardcode them.
  await Promise.all([ensureRegionsLoaded(), ensureTypesLoaded()]);
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
}

export { renderPokemonIndex, renderPokemonDetail, generateSite };

// Only run the full build when invoked directly (`npx tsx main.ts`), so the
// render functions can be imported for testing without triggering a build.
// `process` is read off globalThis so this needs no @types/node to type-check.
const entryPath = (globalThis as any).process?.argv?.[1];
if (entryPath && import.meta.url === `file://${entryPath}`) {
  generateSite();
}
