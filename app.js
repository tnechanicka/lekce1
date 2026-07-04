const PANTRY_STORAGE_KEY = "lidl-recepty-spiz";
const CUSTOM_PANTRY_KEY = "lidl-recepty-vlastni-spiz";
const SAVED_LEAFLETS_KEY = "lidl-recepty-ulozene-letaky";
const ACTIVE_LEAFLET_KEY = "lidl-recepty-aktivni-letak";

const CURRENT_MONTH = new Date().getMonth() + 1;
const MONTH_NAMES = [
    "leden", "únor", "březen", "duben", "květen", "červen",
    "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

// Month (1-12) ranges when an ingredient is fresh/in season in Czechia. Ingredients
// not listed here are treated as available year-round (imported, dried, staples...)
// and never count for or against the "seasonal now" indicator.
const SEASONAL_MONTHS = {
    rajcata: [7, 8, 9, 10], okurka: [6, 7, 8, 9], cuketa: [6, 7, 8, 9], paprika: [7, 8, 9, 10],
    lilek: [7, 8, 9], brokolice: [6, 7, 8, 9, 10], mrkev: [7, 8, 9, 10, 11], celer: [8, 9, 10, 11],
    "brambory-rane": [6, 7], "vodni-meloun": [7, 8, 9], "meloun-cukrovy": [7, 8, 9],
    redkvicky: [5, 6, 7], spenat: [4, 5, 6, 9, 10], zeli: [8, 9, 10, 11], dyne: [8, 9, 10, 11],
    jablka: [9, 10, 11], bazalka: [6, 7, 8, 9], petrzelka: [5, 6, 7, 8, 9], cesnek: [6, 7],
};

// Grouping for the shopping list, so it reads like a real grocery list instead of
// one flat pile of items.
const INGREDIENT_CATEGORY = {
    "kachni-prsa": "Maso, ryby a vejce", "kanic-filet": "Maso, ryby a vejce", klobasa: "Maso, ryby a vejce",
    krevety: "Maso, ryby a vejce", "kureci-prsa": "Maso, ryby a vejce", "kureci-stehna": "Maso, ryby a vejce",
    losos: "Maso, ryby a vejce", "mlete-maso": "Maso, ryby a vejce", "pikok-maso": "Maso, ryby a vejce",
    prazma: "Maso, ryby a vejce", slanina: "Maso, ryby a vejce", spekacky: "Maso, ryby a vejce",
    sunka: "Maso, ryby a vejce", sushi: "Maso, ryby a vejce", treska: "Maso, ryby a vejce",
    tunak: "Maso, ryby a vejce", "tunak-steak": "Maso, ryby a vejce", vejce: "Maso, ryby a vejce",
    "vepr-kotleta": "Maso, ryby a vejce", "vepr-krkovice": "Maso, ryby a vejce", "hovezi-maso": "Maso, ryby a vejce",
    tofu: "Maso, ryby a vejce",
    feta: "Mléčné výrobky a sýry", hermelin: "Mléčné výrobky a sýry", "jogurt-bily": "Mléčné výrobky a sýry",
    maslo: "Mléčné výrobky a sýry", mleko: "Mléčné výrobky a sýry", mozzarella: "Mléčné výrobky a sýry",
    parmezan: "Mléčné výrobky a sýry", smetana: "Mléčné výrobky a sýry", "syr-eidam": "Mléčné výrobky a sýry",
    tvaroh: "Mléčné výrobky a sýry",
    avokado: "Ovoce a zelenina", banan: "Ovoce a zelenina", brambory: "Ovoce a zelenina",
    "brambory-rane": "Ovoce a zelenina", brokolice: "Ovoce a zelenina", celer: "Ovoce a zelenina",
    "cervena-cibule": "Ovoce a zelenina", cibule: "Ovoce a zelenina", citron: "Ovoce a zelenina",
    cuketa: "Ovoce a zelenina", dyne: "Ovoce a zelenina", jablka: "Ovoce a zelenina", lilek: "Ovoce a zelenina",
    limetka: "Ovoce a zelenina", mrkev: "Ovoce a zelenina", okurka: "Ovoce a zelenina", paprika: "Ovoce a zelenina",
    pomeranc: "Ovoce a zelenina", rajcata: "Ovoce a zelenina", redkvicky: "Ovoce a zelenina",
    "ovoce-sezonni": "Ovoce a zelenina", spenat: "Ovoce a zelenina", zeli: "Ovoce a zelenina",
    "zeli-kysane": "Ovoce a zelenina", houby: "Ovoce a zelenina", "vodni-meloun": "Ovoce a zelenina",
    "meloun-cukrovy": "Ovoce a zelenina", zazvor: "Ovoce a zelenina", cesnek: "Ovoce a zelenina",
    petrzelka: "Ovoce a zelenina", bazalka: "Ovoce a zelenina", pazitka: "Ovoce a zelenina",
    mata: "Ovoce a zelenina", koriandr: "Ovoce a zelenina", rozmaryn: "Ovoce a zelenina", tymian: "Ovoce a zelenina",
    "ledovy-salat": "Ovoce a zelenina", "salat-rimsky": "Ovoce a zelenina",
    "anglicka-mufinka": "Přílohy, obiloviny a luštěniny", bageta: "Přílohy, obiloviny a luštěniny",
    bulgur: "Přílohy, obiloviny a luštěniny", chleba: "Přílohy, obiloviny a luštěniny",
    gnocchi: "Přílohy, obiloviny a luštěniny", houska: "Přílohy, obiloviny a luštěniny",
    kuskus: "Přílohy, obiloviny a luštěniny", "listove-testo": "Přílohy, obiloviny a luštěniny",
    "mouka-hladka": "Přílohy, obiloviny a luštěniny", musli: "Přílohy, obiloviny a luštěniny",
    nudle: "Přílohy, obiloviny a luštěniny", "ovesne-vlocky": "Přílohy, obiloviny a luštěniny",
    "pita-chleba": "Přílohy, obiloviny a luštěniny", quinoa: "Přílohy, obiloviny a luštěniny",
    ryze: "Přílohy, obiloviny a luštěniny", spagety: "Přílohy, obiloviny a luštěniny",
    testoviny: "Přílohy, obiloviny a luštěniny", tortilla: "Přílohy, obiloviny a luštěniny",
    cizrna: "Přílohy, obiloviny a luštěniny", cocka: "Přílohy, obiloviny a luštěniny",
    fazole: "Přílohy, obiloviny a luštěniny", "rajcata-loupana": "Přílohy, obiloviny a luštěniny",
    "houskovy-knedlik": "Přílohy, obiloviny a luštěniny", granola: "Přílohy, obiloviny a luštěniny",
    orechy: "Přílohy, obiloviny a luštěniny", strouhanka: "Přílohy, obiloviny a luštěniny",
    "arasidove-maslo": "Koření, oleje a omáčky", "balzamikovy-ocet": "Koření, oleje a omáčky",
    "bylinky-cerstve": "Koření, oleje a omáčky", chilli: "Koření, oleje a omáčky",
    "chilli-omacka": "Koření, oleje a omáčky", "chilli-vlocky": "Koření, oleje a omáčky",
    cukr: "Koření, oleje a omáčky", horcice: "Koření, oleje a omáčky", humus: "Koření, oleje a omáčky",
    "kari-koreni": "Koření, oleje a omáčky", kmin: "Koření, oleje a omáčky",
    "kokosove-mleko": "Koření, oleje a omáčky", kren: "Koření, oleje a omáčky", majoneza: "Koření, oleje a omáčky",
    med: "Koření, oleje a omáčky", ocet: "Koření, oleje a omáčky", olej: "Koření, oleje a omáčky",
    "olivovy-olej": "Koření, oleje a omáčky", olivy: "Koření, oleje a omáčky",
    "paprika-koreni": "Koření, oleje a omáčky", pepr: "Koření, oleje a omáčky",
    "sezamova-seminka": "Koření, oleje a omáčky", "sezamovy-olej": "Koření, oleje a omáčky",
    skorice: "Koření, oleje a omáčky", "sojova-omacka": "Koření, oleje a omáčky", sul: "Koření, oleje a omáčky",
    "tatarska-omacka": "Koření, oleje a omáčky", wasabi: "Koření, oleje a omáčky",
    "kypricí-prasek": "Koření, oleje a omáčky", nutella: "Koření, oleje a omáčky",
    cokolada: "Koření, oleje a omáčky", "cokoladove-capky": "Koření, oleje a omáčky",
    "okurka-nakladana": "Koření, oleje a omáčky", brusinky: "Koření, oleje a omáčky",
    bujon: "Koření, oleje a omáčky",
    kofola: "Nápoje", "svijansky-maz": "Nápoje",
};
const CATEGORY_ORDER = [
    "Maso, ryby a vejce", "Mléčné výrobky a sýry", "Ovoce a zelenina",
    "Přílohy, obiloviny a luštěniny", "Koření, oleje a omáčky", "Nápoje", "Ostatní",
];

function categoryOf(id) {
    return INGREDIENT_CATEGORY[id] || "Ostatní";
}

function isSeasonalNow(id) {
    if (id === "ovoce-sezonni") return true;
    const months = SEASONAL_MONTHS[id];
    return Boolean(months && months.includes(CURRENT_MONTH));
}

function seasonalCount(recipe) {
    return recipe.ingredients.filter((ing) => isSeasonalNow(ing.id)).length;
}

let leaflet = null;
let baseLeaflet = null;
let recipes = null;
let pantryStaples = null;
let pantry = loadPantry();
let planned = new Set();
let activeTags = new Set();
let maxTime = Infinity;
let seasonOnly = false;

function loadPantry() {
    try {
        const raw = localStorage.getItem(PANTRY_STORAGE_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

function savePantry() {
    localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify([...pantry]));
}

function loadCustomPantryItems() {
    try {
        const raw = localStorage.getItem(CUSTOM_PANTRY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveCustomPantryItems(items) {
    localStorage.setItem(CUSTOM_PANTRY_KEY, JSON.stringify(items));
}

function allPantryItems() {
    const custom = loadCustomPantryItems();
    const staples = pantryStaples.items.filter((s) => !custom.some((c) => c.id === s.id));
    return [...staples, ...custom];
}

function addCustomPantryItem(name) {
    const id = slugifyLeafletId(name);
    const custom = loadCustomPantryItems().filter((c) => c.id !== id);
    custom.push({ id, name });
    saveCustomPantryItems(custom);
    pantry.add(id);
    savePantry();
    renderPantry();
    renderIngredientModeRecipes();
}

function removeCustomPantryItem(id) {
    saveCustomPantryItems(loadCustomPantryItems().filter((c) => c.id !== id));
    pantry.delete(id);
    savePantry();
    renderPantry();
    renderIngredientModeRecipes();
}

function leafletItemById(id) {
    return leaflet.items.find((i) => i.id === id);
}

function slugifyLeafletId(name) {
    return (
        name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-+|-+$)/g, "")
            .slice(0, 40) || "polozka"
    );
}

async function loadData() {
    const [leafletRes, recipesRes, pantryStaplesRes] = await Promise.all([
        fetch("data/leaflet.json"),
        fetch("data/recipes.json"),
        fetch("data/pantry-staples.json"),
    ]);
    leaflet = await leafletRes.json();
    baseLeaflet = JSON.parse(JSON.stringify(leaflet));
    recipes = await recipesRes.json();
    pantryStaples = await pantryStaplesRes.json();
}

function renderValidity() {
    const activeId = loadActiveLeafletId();
    const active = activeId && loadSavedLeaflets().find((l) => l.id === activeId);
    const suffix = active ? ` (uložený leták „${active.name}“)` : "";
    document.getElementById("validity").textContent =
        `Platnost letáku: ${leaflet.validFrom} – ${leaflet.validTo}${suffix}`;
}

function rerenderAll() {
    renderValidity();
    renderPantry();
    renderIngredientModeRecipes();
    renderPreferenceModeRecipes();
    if (!document.getElementById("shopping-list-output").hidden) {
        buildShoppingList();
    }
}

// ---------- Uložené letáky (z nahraných PDF, jen v tomto prohlížeči) ----------

function loadSavedLeaflets() {
    try {
        const raw = localStorage.getItem(SAVED_LEAFLETS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveSavedLeaflets(list) {
    localStorage.setItem(SAVED_LEAFLETS_KEY, JSON.stringify(list));
}

function loadActiveLeafletId() {
    return localStorage.getItem(ACTIVE_LEAFLET_KEY);
}

function applyActiveLeaflet() {
    const activeId = loadActiveLeafletId();
    leaflet = JSON.parse(JSON.stringify(baseLeaflet));
    const active = activeId && loadSavedLeaflets().find((l) => l.id === activeId);
    if (!active) return;

    if (active.validFrom) leaflet.validFrom = active.validFrom;
    if (active.validTo) leaflet.validTo = active.validTo;

    for (const item of active.items) {
        const existing = leaflet.items.find((i) => i.id === item.id);
        if (existing) {
            existing.name = item.name;
            existing.price = item.price;
        } else {
            leaflet.items.push(item);
        }
    }
}

function saveNewLeaflet(name, items, validFrom, validTo) {
    const id = slugifyLeafletId(name) + "-" + Date.now();
    const list = loadSavedLeaflets().filter((l) => l.name !== name);
    list.push({ id, name, items, validFrom, validTo, savedAt: new Date().toISOString() });
    saveSavedLeaflets(list);
    localStorage.setItem(ACTIVE_LEAFLET_KEY, id);
    applyActiveLeaflet();
    rerenderAll();
    return id;
}

function setActiveLeaflet(id) {
    if (id) {
        localStorage.setItem(ACTIVE_LEAFLET_KEY, id);
    } else {
        localStorage.removeItem(ACTIVE_LEAFLET_KEY);
    }
    applyActiveLeaflet();
    rerenderAll();
}

function deleteSavedLeaflet(id) {
    saveSavedLeaflets(loadSavedLeaflets().filter((l) => l.id !== id));
    if (loadActiveLeafletId() === id) {
        setActiveLeaflet(null);
    } else {
        rerenderAll();
    }
}

// ---------- Moje spíž ----------

function renderPantry() {
    const container = document.getElementById("pantry-list");
    const customIds = new Set(loadCustomPantryItems().map((c) => c.id));
    container.innerHTML = "";
    for (const item of allPantryItems()) {
        const label = document.createElement("label");
        label.className = "leaflet-item";
        label.innerHTML = `
            <input type="checkbox" value="${item.id}" ${pantry.has(item.id) ? "checked" : ""}>
            <span>${item.name}</span>
            ${customIds.has(item.id) ? '<span class="pantry-remove">×</span>' : ""}
        `;
        label.querySelector("input").addEventListener("change", (e) => {
            setPantryItem(item.id, e.target.checked);
        });
        if (customIds.has(item.id)) {
            label.querySelector(".pantry-remove").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                removeCustomPantryItem(item.id);
            });
        }
        container.appendChild(label);
    }
    document.getElementById("pantry-count").textContent = pantry.size > 0 ? `(${pantry.size})` : "";
}

function setPantryItem(id, has) {
    if (has) {
        pantry.add(id);
    } else {
        pantry.delete(id);
    }
    savePantry();
    renderPantry();
    renderIngredientModeRecipes();
    if (!document.getElementById("shopping-list-output").hidden) {
        buildShoppingList();
    }
}

function initPantryAddForm() {
    const form = document.getElementById("pantry-add-form");
    const input = document.getElementById("pantry-add-input");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (!name) return;
        addCustomPantryItem(name);
        input.value = "";
    });
}

// ---------- Mode: podle surovin ----------

function scoreRecipe(recipe, haveIds, hasSelection) {
    const total = recipe.ingredients.length;
    const matched = hasSelection
        ? recipe.ingredients.filter((ing) => haveIds.has(ing.id)).length
        : total;
    return { matched, total };
}

function renderRecipeCard(recipe, { matched, total }, haveIds, hasSelection) {
    const card = document.createElement("article");
    card.className = "recipe-card";

    const ingredientRows = recipe.ingredients
        .map((ing) => {
            const missing = hasSelection && !haveIds.has(ing.id);
            const onSale = leafletItemById(ing.id);
            const saleTag = onSale ? `<span class="on-sale-tag">🏷️ v akci</span>` : "";
            return `
                <li class="${missing ? "missing" : ""}">
                    <span class="ingredient-name">${ing.name}${saleTag}</span>
                    <span class="ingredient-amount">${ing.amount}</span>
                </li>`;
        })
        .join("");

    const badgeClass = matched === total ? "match-badge full" : "match-badge";
    const seasonal = seasonalCount(recipe);
    const seasonBadge = seasonal > 0 ? `<span class="season-badge">🌱 Sezónní</span>` : "";

    card.innerHTML = `
        <span class="recipe-emoji">${recipe.emoji}</span>
        <h3>${recipe.name}</h3>
        <div class="stat-row">
            <div class="stat"><span class="stat-value">${recipe.time}</span><span class="stat-label">min</span></div>
            <div class="stat"><span class="stat-value">${recipe.servings}</span><span class="stat-label">porce</span></div>
            <div class="stat"><span class="stat-value">${total}</span><span class="stat-label">surovin</span></div>
        </div>
        <span class="${badgeClass}">${matched}/${total} máš ve spíži</span>
        ${seasonBadge}
        <ul class="ingredient-list">${ingredientRows}</ul>
        <div class="instructions">
            <ol>${recipe.instructions.map((step) => `<li>${step}</li>`).join("")}</ol>
        </div>
    `;
    card.addEventListener("click", (e) => {
        if (e.target.closest("input")) return;
        card.classList.toggle("expanded");
    });
    return card;
}

function renderIngredientModeRecipes() {
    const container = document.getElementById("recipe-list-ingredients");
    const hasSelection = pantry.size > 0;

    const scored = recipes.map((recipe) => ({
        recipe,
        ...scoreRecipe(recipe, pantry, hasSelection),
        seasonal: seasonalCount(recipe),
    }));
    scored.sort(
        (a, b) =>
            b.matched / b.total - a.matched / a.total ||
            b.seasonal - a.seasonal ||
            b.matched - a.matched
    );

    container.innerHTML = "";
    for (const { recipe, matched, total } of scored) {
        container.appendChild(renderRecipeCard(recipe, { matched, total }, pantry, hasSelection));
    }
}

// ---------- Mode: podle preferencí ----------

function allTags() {
    const tags = new Set();
    for (const r of recipes) {
        for (const t of r.tags) tags.add(t);
    }
    return [...tags].sort();
}

const TAG_LABELS = {
    maso: "Maso",
    ryba: "Ryby a mořské plody",
    vegetarianske: "Vegetariánské",
    vegan: "Veganské",
    rychle: "Rychlé (do 20 min)",
    grilovani: "Grilování",
    snidane: "Snídaně",
    asijske: "Asijská inspirace",
    polevka: "Polévka",
    salat: "Salát",
    dezert: "Dezert/pečení",
    testoviny: "Těstoviny",
    italska: "Italská kuchyně",
};

function renderFilterPanel() {
    const container = document.getElementById("filter-panel");
    const tags = allTags();

    const tagButtons = tags
        .map(
            (tag) => `
        <label class="filter-chip">
            <input type="checkbox" value="${tag}">
            <span>${TAG_LABELS[tag] || tag}</span>
        </label>`
        )
        .join("");

    container.innerHTML = `
        <div class="filter-group">
            <span class="filter-group-label">Preference:</span>
            ${tagButtons}
        </div>
        <div class="filter-group">
            <label class="filter-chip" id="season-filter-chip">
                <input type="checkbox" id="season-filter">
                <span>🌱 Jen sezónní teď (${MONTH_NAMES[CURRENT_MONTH - 1]})</span>
            </label>
        </div>
        <div class="filter-group">
            <label class="filter-group-label" for="time-filter">Max. čas přípravy:</label>
            <select id="time-filter">
                <option value="">bez omezení</option>
                <option value="20">do 20 min</option>
                <option value="30">do 30 min</option>
                <option value="45">do 45 min</option>
            </select>
        </div>
    `;

    container.querySelectorAll(".filter-chip input[type=checkbox]").forEach((input) => {
        if (input.id === "season-filter") return;
        input.addEventListener("change", () => {
            if (input.checked) {
                activeTags.add(input.value);
            } else {
                activeTags.delete(input.value);
            }
            renderPreferenceModeRecipes();
        });
    });

    document.getElementById("season-filter").addEventListener("change", (e) => {
        seasonOnly = e.target.checked;
        renderPreferenceModeRecipes();
    });

    document.getElementById("time-filter").addEventListener("change", (e) => {
        maxTime = e.target.value ? Number(e.target.value) : Infinity;
        renderPreferenceModeRecipes();
    });
}

function filteredRecipes() {
    return recipes.filter((r) => {
        if (r.time > maxTime) return false;
        if (activeTags.size > 0 && ![...activeTags].some((t) => r.tags.includes(t))) return false;
        if (seasonOnly && seasonalCount(r) === 0) return false;
        return true;
    });
}

function renderPreferenceModeRecipes() {
    const container = document.getElementById("recipe-list-preferences");
    const list = filteredRecipes();
    const hasSelection = pantry.size > 0;

    const scored = list.map((recipe) => ({ recipe, seasonal: seasonalCount(recipe) }));
    scored.sort((a, b) => b.seasonal - a.seasonal);

    container.innerHTML = "";
    if (scored.length === 0) {
        container.innerHTML = "<p>Žádný recept neodpovídá vybraným preferencím.</p>";
    }
    for (const { recipe } of scored) {
        const { matched, total } = scoreRecipe(recipe, pantry, hasSelection);
        const card = renderRecipeCard(recipe, { matched, total }, pantry, hasSelection);
        card.classList.add("selectable");

        const checkboxWrap = document.createElement("label");
        checkboxWrap.className = "plan-checkbox";
        checkboxWrap.innerHTML = `<input type="checkbox" ${planned.has(recipe.id) ? "checked" : ""}> Přidat do plánu`;
        checkboxWrap.querySelector("input").addEventListener("change", (e) => {
            if (e.target.checked) {
                planned.add(recipe.id);
            } else {
                planned.delete(recipe.id);
            }
            updateSelectedCount();
        });
        card.prepend(checkboxWrap);
        if (planned.has(recipe.id)) card.classList.add("planned");

        container.appendChild(card);
    }
    updateSelectedCount();
}

function updateSelectedCount() {
    const el = document.getElementById("selected-count");
    el.textContent = planned.size > 0 ? `Vybráno receptů: ${planned.size}` : "";
    document.querySelectorAll("#recipe-list-preferences .recipe-card").forEach((card) => {
        const checkbox = card.querySelector(".plan-checkbox input");
        card.classList.toggle("planned", checkbox && checkbox.checked);
    });
}

// ---------- Nákupní seznam ----------

function parsePriceNumber(priceStr) {
    const match = priceStr.match(/([\d,.]+)\s*Kč/);
    if (!match) return null;
    return parseFloat(match[1].replace(",", "."));
}

function buildShoppingList() {
    const selectedRecipes = recipes.filter((r) => planned.has(r.id));
    const output = document.getElementById("shopping-list-output");

    if (selectedRecipes.length === 0) {
        output.hidden = true;
        alert("Nejdřív vyber aspoň jeden recept do plánu (zaškrtni „Přidat do plánu“ u receptu výše).");
        return;
    }

    const agg = new Map();
    for (const recipe of selectedRecipes) {
        for (const ing of recipe.ingredients) {
            if (!agg.has(ing.id)) agg.set(ing.id, { name: ing.name, uses: [] });
            agg.get(ing.id).uses.push({ amount: ing.amount, recipeName: recipe.name });
        }
    }

    const toBuy = [];
    const alreadyHave = [];
    for (const [id, data] of agg) {
        (pantry.has(id) ? alreadyHave : toBuy).push({ id, ...data });
    }

    let estimatedTotal = 0;
    let hasPriced = false;
    for (const { id } of toBuy) {
        const item = leafletItemById(id);
        if (!item) continue;
        const price = parsePriceNumber(item.price);
        if (price !== null) {
            estimatedTotal += price;
            hasPriced = true;
        }
    }

    const renderLine = (id, name, uses, checked) => {
        const usesText = uses.map((u) => `${u.amount} (${u.recipeName})`).join(", ");
        const onSale = leafletItemById(id);
        const priceTag = onSale ? `<span class="on-sale-tag">🏷️ v akci ${onSale.price}</span>` : "";
        return `
            <li>
                <label>
                    <input type="checkbox" data-pantry-id="${id}" ${checked ? "checked" : ""}>
                    <span class="shopping-line-text">
                        <strong>${name}</strong>${priceTag}
                        <span class="uses">${usesText}</span>
                    </span>
                </label>
            </li>`;
    };

    const groupByCategory = (items) => {
        const groups = new Map();
        for (const item of items) {
            const cat = categoryOf(item.id);
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat).push(item);
        }
        return CATEGORY_ORDER.filter((c) => groups.has(c)).map((c) => [c, groups.get(c)]);
    };

    const renderGrouped = (items, checked) => {
        if (items.length === 0) return "";
        return groupByCategory(items)
            .map(
                ([cat, group]) => `
                <h4 class="shopping-category">${cat}</h4>
                <ul class="shopping-items">
                    ${group.map(({ id, name, uses }) => renderLine(id, name, uses, checked)).join("")}
                </ul>`
            )
            .join("");
    };

    const listEl = document.getElementById("shopping-list");
    listEl.innerHTML = `
        <h3>K nákupu (${toBuy.length})</h3>
        ${renderGrouped(toBuy, false) || "<p>Vše už máš doma.</p>"}
        <p class="estimate">Odhad ceny položek aktuálně v letákové akci: ~${estimatedTotal.toFixed(2)} Kč${hasPriced ? "" : " (žádná z položek k nákupu není zrovna v letákové akci)"}</p>

        <h3>Už máš doma</h3>
        ${renderGrouped(alreadyHave, true) || "<p>Nic z tvé spíže se v receptech nepoužije.</p>"}
    `;

    listEl.querySelectorAll("input[data-pantry-id]").forEach((input) => {
        input.addEventListener("change", (e) => {
            setPantryItem(e.target.dataset.pantryId, e.target.checked);
        });
    });

    output.hidden = false;
    renderLeftoverRecipes(new Set([...toBuy, ...alreadyHave].map((x) => x.id)));
    output.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLeftoverRecipes(haveAfterShoppingIds) {
    const container = document.getElementById("leftover-recipes");
    const candidates = recipes
        .filter((r) => !planned.has(r.id))
        .map((r) => {
            const matched = r.ingredients.filter((ing) => haveAfterShoppingIds.has(ing.id)).length;
            return { recipe: r, matched, total: r.ingredients.length };
        })
        .filter((c) => c.matched > 0)
        .sort((a, b) => b.matched / b.total - a.matched / a.total || b.matched - a.matched)
        .slice(0, 4);

    container.innerHTML = "";
    if (candidates.length === 0) {
        container.innerHTML = "<p>Žádné další recepty nevyužijí zbylé suroviny.</p>";
        return;
    }

    for (const { recipe, matched, total } of candidates) {
        const card = renderRecipeCard(recipe, { matched, total }, haveAfterShoppingIds, true);
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "add-leftover-btn";
        addBtn.textContent = "+ Přidat do plánu a přepočítat";
        addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            planned.add(recipe.id);
            renderPreferenceModeRecipes();
            buildShoppingList();
        });
        card.prepend(addBtn);
        container.appendChild(card);
    }
}

// ---------- Tabs ----------

function initTabs() {
    document.querySelectorAll(".tab").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const mode = btn.dataset.mode;
            document.getElementById("mode-ingredients").hidden = mode !== "ingredients";
            document.getElementById("mode-preferences").hidden = mode !== "preferences";
        });
    });

    document.getElementById("build-list-btn").addEventListener("click", buildShoppingList);
}

async function init() {
    await loadData();
    applyActiveLeaflet();
    renderValidity();
    renderPantry();
    initPantryAddForm();
    renderIngredientModeRecipes();
    renderFilterPanel();
    renderPreferenceModeRecipes();
    initTabs();
}

init();
