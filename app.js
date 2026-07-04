const PANTRY_STORAGE_KEY = "lidl-recepty-spiz";

let leaflet = null;
let recipes = null;
let pantry = loadPantry();
let planned = new Set();
let activeTags = new Set();
let maxTime = Infinity;

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

function leafletItemById(id) {
    return leaflet.items.find((i) => i.id === id);
}

async function loadData() {
    const [leafletRes, recipesRes] = await Promise.all([
        fetch("data/leaflet.json"),
        fetch("data/recipes.json"),
    ]);
    leaflet = await leafletRes.json();
    recipes = await recipesRes.json();
}

function renderValidity() {
    document.getElementById("validity").textContent =
        `Platnost letáku: ${leaflet.validFrom} – ${leaflet.validTo}`;
}

// ---------- Moje spíž ----------

function renderPantry() {
    const container = document.getElementById("pantry-list");
    container.innerHTML = "";
    for (const item of leaflet.items) {
        const label = document.createElement("label");
        label.className = "leaflet-item";
        label.innerHTML = `
            <input type="checkbox" value="${item.id}" ${pantry.has(item.id) ? "checked" : ""}>
            <span>${item.name}</span>
            <span class="price">${item.price}</span>
        `;
        label.querySelector("input").addEventListener("change", (e) => {
            setPantryItem(item.id, e.target.checked);
        });
        container.appendChild(label);
    }
}

function setPantryItem(id, has) {
    if (has) {
        pantry.add(id);
    } else {
        pantry.delete(id);
    }
    savePantry();
    renderIngredientModeRecipes();
    if (!document.getElementById("shopping-list-output").hidden) {
        buildShoppingList();
    }
}

// ---------- Mode: podle surovin ----------

function scoreRecipe(recipe, haveIds, hasSelection) {
    const total = recipe.leafletIngredients.length;
    const matched = hasSelection
        ? recipe.leafletIngredients.filter((ing) => haveIds.has(ing.id)).length
        : total;
    return { matched, total };
}

function renderRecipeCard(recipe, { matched, total }, haveIds, hasSelection) {
    const card = document.createElement("article");
    card.className = "recipe-card";

    const ingredientItems = recipe.leafletIngredients
        .map((ing) => {
            const item = leafletItemById(ing.id);
            const missing = hasSelection && !haveIds.has(ing.id);
            return `<li class="${missing ? "missing" : ""}">${item.name} – ${ing.amount}</li>`;
        })
        .join("");

    const badgeClass = matched === total ? "match-badge full" : "match-badge";

    card.innerHTML = `
        <span class="recipe-emoji">${recipe.emoji}</span>
        <h3>${recipe.name}</h3>
        <div class="recipe-meta">⏱ ${recipe.time} min · 🍽 ${recipe.servings} porce</div>
        <span class="${badgeClass}">${matched}/${total} surovin z letáku</span>
        <ul class="ingredient-list">${ingredientItems}</ul>
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

    const scored = recipes.map((recipe) => ({ recipe, ...scoreRecipe(recipe, pantry, hasSelection) }));
    scored.sort((a, b) => b.matched / b.total - a.matched / a.total || b.matched - a.matched);

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
    rychle: "Rychlé (do 20 min)",
    grilovani: "Grilování",
    snidane: "Snídaně",
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
            <label class="filter-group-label" for="time-filter">Max. čas přípravy:</label>
            <select id="time-filter">
                <option value="">bez omezení</option>
                <option value="20">do 20 min</option>
                <option value="30">do 30 min</option>
                <option value="45">do 45 min</option>
            </select>
        </div>
    `;

    container.querySelectorAll(".filter-chip input").forEach((input) => {
        input.addEventListener("change", () => {
            if (input.checked) {
                activeTags.add(input.value);
            } else {
                activeTags.delete(input.value);
            }
            renderPreferenceModeRecipes();
        });
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
        return true;
    });
}

function renderPreferenceModeRecipes() {
    const container = document.getElementById("recipe-list-preferences");
    const list = filteredRecipes();
    const hasSelection = pantry.size > 0;

    container.innerHTML = "";
    if (list.length === 0) {
        container.innerHTML = "<p>Žádný recept neodpovídá vybraným preferencím.</p>";
    }
    for (const recipe of list) {
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

    const leafletAgg = new Map();
    const pantryStaples = new Set();

    for (const recipe of selectedRecipes) {
        for (const ing of recipe.leafletIngredients) {
            if (!leafletAgg.has(ing.id)) leafletAgg.set(ing.id, []);
            leafletAgg.get(ing.id).push({ amount: ing.amount, recipeName: recipe.name });
        }
        for (const staple of recipe.pantryIngredients) {
            pantryStaples.add(staple);
        }
    }

    const toBuy = [];
    const alreadyHave = [];
    for (const [id, uses] of leafletAgg) {
        (pantry.has(id) ? alreadyHave : toBuy).push({ id, uses });
    }

    let estimatedTotal = 0;
    let hasUnestimated = false;
    for (const { id } of toBuy) {
        const price = parsePriceNumber(leafletItemById(id).price);
        if (price === null) hasUnestimated = true;
        else estimatedTotal += price;
    }

    const renderLine = (id, uses, checked) => {
        const item = leafletItemById(id);
        const usesText = uses.map((u) => `${u.amount} (${u.recipeName})`).join(", ");
        return `
            <li>
                <label>
                    <input type="checkbox" data-pantry-id="${id}" ${checked ? "checked" : ""}>
                    <strong>${item.name}</strong> – ${item.price}
                    <span class="uses">${usesText}</span>
                </label>
            </li>`;
    };

    const listEl = document.getElementById("shopping-list");
    listEl.innerHTML = `
        <h3>K nákupu (${toBuy.length})</h3>
        <ul class="shopping-items">
            ${toBuy.map(({ id, uses }) => renderLine(id, uses, false)).join("") || "<li>Vše už máš doma.</li>"}
        </ul>
        <p class="estimate">Odhad ceny k nákupu: ~${estimatedTotal.toFixed(2)} Kč${hasUnestimated ? " (u některých položek cena za jednotku neodpovídá potřebnému množství, jde jen o orientaci)" : ""}</p>

        <h3>Už máš doma (ze spíže)</h3>
        <ul class="shopping-items">
            ${alreadyHave.map(({ id, uses }) => renderLine(id, uses, true)).join("") || "<li>Nic ze spíže se v receptech nepoužije.</li>"}
        </ul>

        <h3>Základní suroviny (pravděpodobně už doma máš)</h3>
        <ul class="pantry-staples">
            ${[...pantryStaples].sort().map((s) => `<li>${s}</li>`).join("")}
        </ul>
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
            const matched = r.leafletIngredients.filter((ing) => haveAfterShoppingIds.has(ing.id)).length;
            return { recipe: r, matched, total: r.leafletIngredients.length };
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
    renderValidity();
    renderPantry();
    renderIngredientModeRecipes();
    renderFilterPanel();
    renderPreferenceModeRecipes();
    initTabs();
}

init();
