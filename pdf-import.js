const PRICE_RE = /(\d{1,4}(?:[.,]\d{1,2})?)\s*Kč(?:\s*\/\s*[\wá-ž.,]+)?/i;
// Some flyers (e.g. Tesco) print the sale price as a big whole-koruna number with a
// small raised "haléře" superscript and no "Kč" text at all near it. Because the
// superscript sits higher on the page, it ends up as its own short line just above
// the whole-number line once text is grouped by y-coordinate. This is a heuristic,
// not a guarantee — always double-check the review table before using it.
const BARE_WHOLE_RE = /^\d{1,4}$/;
const BARE_DECIMAL_RE = /^\d{2}$/;
// A line that's just digits/punctuation/percent (old crossed-out prices, "-63%"
// discount tags, bare price fragments...) is never a usable product name, even if
// it doesn't match the price patterns above — it needs at least one letter.
const HAS_LETTER_RE = /[a-zá-žA-ZÁ-Ž]/;
// Generic price-tag banners that sit right next to the price but aren't the product
// name (seen on Tesco-style tags, where the name is actually the *next* line down).
const BANNER_PHRASES = ["cena pro vsechny", "super cena", "akcni cena", "novinka", "doporucena cena"];

function normalizeForBannerCheck(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function isLikelyName(text) {
    if (text.length < 3 || !HAS_LETTER_RE.test(text)) return false;
    if (PRICE_RE.test(text) || BARE_WHOLE_RE.test(text) || BARE_DECIMAL_RE.test(text)) return false;
    if (BANNER_PHRASES.includes(normalizeForBannerCheck(text))) return false;
    return true;
}

async function extractPdfLines(file) {
    const pdfjsLib = await import("./vendor/pdfjs/pdf.min.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.min.mjs", document.baseURI).href;

    const buffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

    const lines = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        const items = content.items
            .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }))
            .filter((it) => it.str.trim().length > 0);

        items.sort((a, b) => b.y - a.y || a.x - b.x);

        const pageLines = [];
        const Y_TOLERANCE = 2.5;
        for (const it of items) {
            let line = pageLines.find((l) => Math.abs(l.y - it.y) <= Y_TOLERANCE);
            if (!line) {
                line = { y: it.y, parts: [] };
                pageLines.push(line);
            }
            line.parts.push(it);
        }
        pageLines.sort((a, b) => b.y - a.y);

        for (const line of pageLines) {
            line.parts.sort((a, b) => a.x - b.x);
            const text = line.parts
                .map((p) => p.str)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();
            if (text) lines.push({ page: pageNum, text });
        }
    }
    return lines;
}

function extractCandidates(lines) {
    const candidates = [];
    const consumed = new Set();

    for (let i = 0; i < lines.length; i++) {
        if (consumed.has(i)) continue;
        const { text } = lines[i];

        let price = null;
        let nameFromSameLine = "";
        let priceLineIndex = i;

        const match = text.match(PRICE_RE);
        if (match) {
            price = match[0].trim();
            nameFromSameLine = text.slice(0, match.index).trim();
        } else if (
            BARE_WHOLE_RE.test(text) &&
            i > 0 &&
            !consumed.has(i - 1) &&
            BARE_DECIMAL_RE.test(lines[i - 1].text)
        ) {
            // Split-price fallback (see BARE_WHOLE_RE/BARE_DECIMAL_RE above).
            price = `${text},${lines[i - 1].text} Kč`;
            consumed.add(i - 1);
            priceLineIndex = i - 1;
        }
        if (!price) continue;

        let name = nameFromSameLine;
        for (let back = 1; back <= 2 && !isLikelyName(name) && priceLineIndex - back >= 0; back++) {
            const candidate = lines[priceLineIndex - back].text;
            if (isLikelyName(candidate)) {
                name = candidate;
            }
        }
        // Some layouts (e.g. Tesco) put the product name *below* the price instead of
        // above it, often behind a generic "Super cena"-style banner line — look
        // forward past those once the backward search comes up empty.
        for (let fwd = 1; fwd <= 4 && !isLikelyName(name) && i + fwd < lines.length; fwd++) {
            const candidate = lines[i + fwd].text;
            if (isLikelyName(candidate)) {
                name = candidate;
            }
        }
        if (!isLikelyName(name)) continue;

        candidates.push({ id: slugifyLeafletId(name), name, price });
    }

    const seen = new Set();
    return candidates.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
    });
}

function addReviewRow(tbody, row = { id: "", name: "", price: "" }) {
    const tr = document.createElement("tr");
    const existing = leaflet.items.find((i) => i.id === row.id);
    tr.innerHTML = `
        <td><input type="checkbox" class="pdf-row-include" checked></td>
        <td><input type="text" class="pdf-row-id" value="${row.id}"></td>
        <td><input type="text" class="pdf-row-name" value="${row.name}"></td>
        <td><input type="text" class="pdf-row-price" value="${row.price}"></td>
        <td><span class="pdf-row-tag">${existing ? "aktualizace" : "nová položka"}</span>
            <button type="button" class="pdf-row-remove">×</button></td>
    `;
    tr.querySelector(".pdf-row-remove").addEventListener("click", () => tr.remove());
    tbody.appendChild(tr);
}

function collectReviewRows() {
    const rows = [];
    document.querySelectorAll("#pdf-review-table tbody tr").forEach((tr) => {
        if (!tr.querySelector(".pdf-row-include").checked) return;
        const id = tr.querySelector(".pdf-row-id").value.trim();
        const name = tr.querySelector(".pdf-row-name").value.trim();
        const price = tr.querySelector(".pdf-row-price").value.trim();
        if (id && name && price) rows.push({ id, name, price });
    });
    return rows;
}

function formatSavedLeafletLabel(saved) {
    const range = saved.validFrom && saved.validTo ? ` (${saved.validFrom} – ${saved.validTo})` : "";
    return `${saved.name}${range}`;
}

function renderSavedLeafletSelect() {
    const select = document.getElementById("saved-leaflet-select");
    const activeId = loadActiveLeafletId();
    const saved = loadSavedLeaflets();

    select.innerHTML = `<option value="">Výchozí leták (data/leaflet.json)</option>`;
    for (const item of saved) {
        const opt = document.createElement("option");
        opt.value = item.id;
        opt.textContent = formatSavedLeafletLabel(item);
        if (item.id === activeId) opt.selected = true;
        select.appendChild(opt);
    }
}

function initPdfImport() {
    const input = document.getElementById("pdf-input");
    const status = document.getElementById("pdf-status");
    const review = document.getElementById("pdf-review");
    const tbody = document.querySelector("#pdf-review-table tbody");
    const rawTextContent = document.getElementById("pdf-raw-text-content");
    const nameInput = document.getElementById("pdf-leaflet-name");
    const savedSelect = document.getElementById("saved-leaflet-select");

    renderSavedLeafletSelect();

    input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        if (!leaflet) {
            status.textContent = "Appka se ještě načítá, zkus to za chvíli znovu.";
            input.value = "";
            return;
        }

        status.textContent = "Zpracovávám PDF (u velkých letáků to může chvíli trvat)…";
        tbody.innerHTML = "";
        review.hidden = true;

        try {
            const lines = await extractPdfLines(file);
            const candidates = extractCandidates(lines);

            rawTextContent.textContent = lines.map((l) => `[str. ${l.page}] ${l.text}`).join("\n");
            for (const candidate of candidates) addReviewRow(tbody, candidate);

            if (!nameInput.value) {
                nameInput.value = `Lidl leták (${file.name.replace(/\.pdf$/i, "")})`;
            }

            const pageCount = new Set(lines.map((l) => l.page)).size;
            review.hidden = false;
            status.textContent = `Nalezeno ${candidates.length} položek s cenou v ${lines.length} řádcích textu z ${pageCount} stran. Zkontroluj níže.`;
        } catch (err) {
            status.textContent = `Zpracování PDF selhalo: ${err.message}`;
        }
    });

    document.getElementById("pdf-add-row-btn").addEventListener("click", () => addReviewRow(tbody));

    document.getElementById("pdf-apply-btn").addEventListener("click", () => {
        const items = collectReviewRows();
        if (items.length === 0) {
            alert("Nezaškrtl jsi žádnou položku k použití.");
            return;
        }
        const name = nameInput.value.trim();
        if (!name) {
            alert("Zadej název letáku (např. „Lidl leták od 6.7.“), pod kterým se uloží.");
            return;
        }
        const validFrom = document.getElementById("pdf-valid-from").value || null;
        const validTo = document.getElementById("pdf-valid-to").value || null;
        saveNewLeaflet(name, items, validFrom, validTo);
        renderSavedLeafletSelect();
        status.textContent = `Leták „${name}“ uložen a použit (${items.length} položek).`;
    });

    document.getElementById("pdf-download-btn").addEventListener("click", () => {
        const items = collectReviewRows();
        const validFrom = document.getElementById("pdf-valid-from").value || leaflet.validFrom;
        const validTo = document.getElementById("pdf-valid-to").value || leaflet.validTo;
        const merged = JSON.parse(JSON.stringify(baseLeaflet));
        merged.validFrom = validFrom;
        merged.validTo = validTo;
        for (const item of items) {
            const existing = merged.items.find((i) => i.id === item.id);
            if (existing) Object.assign(existing, item);
            else merged.items.push(item);
        }
        const blob = new Blob([JSON.stringify(merged, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "leaflet.json";
        a.click();
        URL.revokeObjectURL(a.href);
    });

    savedSelect.addEventListener("change", () => {
        setActiveLeaflet(savedSelect.value || null);
        status.textContent = savedSelect.value ? "Přepnuto na uložený leták." : "Přepnuto na výchozí leták.";
    });

    document.getElementById("saved-leaflet-delete-btn").addEventListener("click", () => {
        const id = savedSelect.value;
        if (!id) {
            alert("Vyber v seznamu uložený leták, který chceš smazat.");
            return;
        }
        deleteSavedLeaflet(id);
        renderSavedLeafletSelect();
        status.textContent = "Uložený leták byl smazán.";
    });
}

initPdfImport();
