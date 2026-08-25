"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("burgers-view");

  let state = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  async function apiGet() {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL + "?key=burgers", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return json.value || [];
  }

  async function apiSave(data) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ key: "burgers", value: data }),
    });
    if (!res.ok) throw new Error("Échec de l'enregistrement.");
    const json = await res.json();
    if (json.deployTriggered === false) {
      throw new Error(
        "Enregistré, mais la republication du site a échoué. Contactez la personne qui gère le site."
      );
    }
  }

  function render() {
    if (state.screen === "loading") {
      container.innerHTML = '<div class="editor-loading">Chargement…</div>';
      return;
    }
    if (state.screen === "error") {
      container.innerHTML =
        '<button type="button" class="back-btn" id="b-back-menu">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("b-back-menu").addEventListener("click", () => window.adminShowDashboard());
      return;
    }
    if (state.screen === "categories") renderCategories();
    else if (state.screen === "items") renderItems();
    else if (state.screen === "edit") renderEdit();
  }

  function renderCategories() {
    const rows = state.data
      .map((cat, i) => {
        const count = cat.items.length;
        return (
          '<button type="button" class="list-row" data-cat="' + i + '">' +
          '<span class="list-row-main">' +
          '<span class="list-row-title">' + esc(cat.title) + "</span>" +
          '<span class="list-row-sub">' + count + " burger" + (count > 1 ? "s" : "") + "</span>" +
          "</span>" +
          '<span class="list-row-arrow">›</span>' +
          "</button>"
        );
      })
      .join("");

    container.innerHTML =
      '<button type="button" class="back-btn" id="b-back-menu">‹ Retour au menu</button>' +
      "<h1>Les burgers</h1>" +
      '<p class="dashboard-note">Catégories de la carte des burgers.</p>' +
      '<div class="list">' + (rows || '<p class="dashboard-note">Aucune catégorie.</p>') + "</div>" +
      '<button type="button" class="btn-secondary" id="b-add-cat">+ Nouvelle catégorie</button>' +
      saveStatusHtml();

    document.getElementById("b-back-menu").addEventListener("click", () => window.adminShowDashboard());
    document.getElementById("b-add-cat").addEventListener("click", addCategory);
    container.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.catIndex = Number(btn.dataset.cat);
        state.screen = "items";
        render();
      });
    });
  }

  function renderItems() {
    const cat = state.data[state.catIndex];
    const last = cat.items.length - 1;
    const rows = cat.items
      .map((item, i) => {
        const meta = [];
        if (item.sur) meta.push(item.sur + " sur place");
        if (item.emp) meta.push(item.emp + " à emporter");
        return (
          '<div class="list-row-wrap">' +
          '<div class="reorder-btns">' +
          '<button type="button" class="reorder-btn" data-up="' + i + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Monter">▲</button>' +
          '<button type="button" class="reorder-btn" data-down="' + i + '"' + (i === last ? " disabled" : "") + ' aria-label="Descendre">▼</button>' +
          "</div>" +
          '<button type="button" class="list-row" data-item="' + i + '">' +
          '<span class="list-row-main">' +
          '<span class="list-row-title">' + esc(item.name) + "</span>" +
          '<span class="list-row-sub">' + esc(meta.join(" · ")) + "</span>" +
          "</span>" +
          '<span class="list-row-arrow">›</span>' +
          "</button>" +
          "</div>"
        );
      })
      .join("");

    container.innerHTML =
      '<button type="button" class="back-btn" id="b-back-cats">‹ Les burgers</button>' +
      '<div class="editor-header-row">' +
      "<h1>" + esc(cat.title) + "</h1>" +
      '<button type="button" class="icon-btn" id="b-rename-cat" aria-label="Renommer la catégorie">✎</button>' +
      '<button type="button" class="icon-btn icon-btn-danger" id="b-delete-cat" aria-label="Supprimer la catégorie">🗑</button>' +
      "</div>" +
      '<div class="list">' + (rows || '<p class="dashboard-note">Aucun burger dans cette catégorie.</p>') + "</div>" +
      '<button type="button" class="btn-secondary" id="b-add-item">+ Nouveau burger</button>' +
      saveStatusHtml();

    document.getElementById("b-back-cats").addEventListener("click", () => {
      state.screen = "categories";
      render();
    });
    document.getElementById("b-rename-cat").addEventListener("click", renameCategory);
    document.getElementById("b-delete-cat").addEventListener("click", deleteCategory);
    document.getElementById("b-add-item").addEventListener("click", () => {
      state.itemIndex = null;
      state.screen = "edit";
      render();
    });
    container.querySelectorAll("[data-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.itemIndex = Number(btn.dataset.item);
        state.screen = "edit";
        render();
      });
    });
    container.querySelectorAll("[data-up]").forEach((btn) => {
      btn.addEventListener("click", () => moveItem(Number(btn.dataset.up), -1));
    });
    container.querySelectorAll("[data-down]").forEach((btn) => {
      btn.addEventListener("click", () => moveItem(Number(btn.dataset.down), 1));
    });
  }

  function moveItem(index, direction) {
    const items = state.data[state.catIndex].items;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const tmp = items[index];
    items[index] = items[target];
    items[target] = tmp;
    persist("items");
  }

  function renderEdit() {
    const cat = state.data[state.catIndex];
    const isNew = state.itemIndex === null;
    const item = isNew ? { name: "", desc: "", sur: "", emp: "", img: "" } : cat.items[state.itemIndex];

    container.innerHTML =
      '<button type="button" class="back-btn" id="b-back-items">‹ ' + esc(cat.title) + "</button>" +
      "<h1>" + (isNew ? "Nouveau burger" : "Modifier le burger") + "</h1>" +
      '<form id="b-item-form">' +
      '<label class="field-label" for="b-name">Nom</label>' +
      '<input class="field" id="b-name" required value="' + esc(item.name) + '">' +
      '<label class="field-label" for="b-desc">Description</label>' +
      '<input class="field" id="b-desc" value="' + esc(item.desc) + '">' +
      '<label class="field-label" for="b-sur">Prix sur place</label>' +
      '<input class="field" id="b-sur" placeholder="16 €" value="' + esc(item.sur) + '">' +
      '<label class="field-label" for="b-emp">Prix à emporter</label>' +
      '<input class="field" id="b-emp" placeholder="13 €" value="' + esc(item.emp) + '">' +
      '<label class="field-label" for="b-img">Image (chemin, optionnel)</label>' +
      '<input class="field" id="b-img" placeholder="assets/mon-burger.png" value="' + esc(item.img || "") + '">' +
      '<button type="submit" class="btn-primary" id="b-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (!isNew
        ? '<button type="button" class="btn-danger" id="b-delete-item"' + (state.saving ? " disabled" : "") + ">Supprimer ce burger</button>"
        : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      "</form>";

    document.getElementById("b-back-items").addEventListener("click", () => {
      state.screen = "items";
      state.saveError = null;
      render();
    });

    document.getElementById("b-item-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const newItem = {
        name: document.getElementById("b-name").value.trim(),
        desc: document.getElementById("b-desc").value.trim(),
        sur: document.getElementById("b-sur").value.trim(),
        emp: document.getElementById("b-emp").value.trim(),
      };
      const img = document.getElementById("b-img").value.trim();
      if (img) newItem.img = img;

      if (isNew) cat.items.push(newItem);
      else cat.items[state.itemIndex] = newItem;

      await persist("items");
    });

    if (!isNew) {
      document.getElementById("b-delete-item").addEventListener("click", async () => {
        if (!confirm("Supprimer ce burger ?")) return;
        cat.items.splice(state.itemIndex, 1);
        await persist("items");
      });
    }
  }

  function saveStatusHtml() {
    if (state.saving) return '<div class="password-success">Enregistrement…</div>';
    if (state.saveError) return '<div class="login-error">' + esc(state.saveError) + "</div>";
    return "";
  }

  async function persist(nextScreen) {
    state.saving = true;
    state.saveError = null;
    render();
    try {
      await apiSave(state.data);
      state.itemIndex = null;
      state.screen = nextScreen;
    } catch (err) {
      state.saveError = err.message;
    } finally {
      state.saving = false;
      render();
    }
  }

  function addCategory() {
    const title = prompt("Nom de la nouvelle catégorie :");
    if (!title || !title.trim()) return;
    state.data.push({ title: title.trim(), items: [] });
    persist("categories");
  }

  function renameCategory() {
    const cat = state.data[state.catIndex];
    const title = prompt("Nouveau nom de la catégorie :", cat.title);
    if (!title || !title.trim()) return;
    cat.title = title.trim();
    persist("items");
  }

  function deleteCategory() {
    const cat = state.data[state.catIndex];
    if (!confirm('Supprimer la catégorie "' + cat.title + '" et ses ' + cat.items.length + " burger(s) ?")) return;
    state.data.splice(state.catIndex, 1);
    persist("categories");
  }

  window.BurgersEditor = {
    async open() {
      state = { screen: "loading", data: [], catIndex: null, itemIndex: null, saving: false, saveError: null };
      render();
      try {
        state.data = await apiGet();
        state.screen = "categories";
      } catch (err) {
        state.screen = "error";
        state.error = err.message;
      }
      render();
    },
  };
})();
