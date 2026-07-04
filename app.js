const selectedIds = new Set();

async function loadData() {
    const [leafletRes, recipesRes] = await Promise.all([
        fetch("data/leaflet.json"),
        fetch("data/recipes.json"),
    ]);
    const leaflet = await leafletRes.json();
    const recipes = await recipesRes.json();
    return { leaflet, recipes };
}

function renderValidity(leaflet) {
    const el = document.getElementById("validity");
    el.textContent = `Platnost letáku: ${leaflet.validFrom} – ${leaflet.validTo}`;
}

function renderLeafletItems(leaflet, recipes) {
    const container = document.getElementById("leaflet-list");
    container.innerHTML = "";
    for (const item of leaflet.items) {
        const label = document.createElement("label");
        label.className = "leaflet-item";
        label.innerHTML = `
            <input type="checkbox" value="${item.id}">
            <span>${item.name}</span>
            <span class="price">${item.price}</span>
        `;
        const checkbox = label.querySelector("input");
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                selectedIds.add(item.id);
            } else {
                selectedIds.delete(item.id);
            }
            renderRecipes(leaflet, recipes);
        });
        container.appendChild(label);
    }
}

function leafletNameById(leaflet, id) {
    const item = leaflet.items.find((i) => i.id === id);
    return item ? item.name : id;
}

function renderRecipes(leaflet, recipes) {
    const container = document.getElementById("recipe-list");
    const hasSelection = selectedIds.size > 0;

    const scored = recipes.map((recipe) => {
        const total = recipe.leafletIngredients.length;
        const matched = hasSelection
            ? recipe.leafletIngredients.filter((id) => selectedIds.has(id)).length
            : total;
        return { recipe, matched, total };
    });

    scored.sort((a, b) => b.matched / b.total - a.matched / a.total || b.matched - a.matched);

    container.innerHTML = "";
    for (const { recipe, matched, total } of scored) {
        const card = document.createElement("article");
        card.className = "recipe-card";

        const ingredientItems = recipe.leafletIngredients
            .map((id) => {
                const name = leafletNameById(leaflet, id);
                const missing = hasSelection && !selectedIds.has(id);
                return `<li class="${missing ? "missing" : ""}">${name}</li>`;
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

        card.addEventListener("click", () => card.classList.toggle("expanded"));
        container.appendChild(card);
    }
}

async function init() {
    const { leaflet, recipes } = await loadData();
    renderValidity(leaflet);
    renderLeafletItems(leaflet, recipes);
    renderRecipes(leaflet, recipes);
}

init();
