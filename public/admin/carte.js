"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("carte-view");
  const MODES = ["Sur place", "À emporter"];

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
    const res = await fetch(API_URL + "?key=cartes", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return json.value || { "Sur place": {}, "À emporter": {} };
  }

  async function apiSave(data) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ key: "cartes", value: data }),
    });
    if (!res.ok) throw new Error("Échec de l'enregistrement.");
    const json = await res.json();
    if (json.deployTriggered === false) {
      throw new Error(
        "Enregistré, mais la republication du site a échoué. Contactez la personne qui gère le site."
      );
    }
  }

  function currentCategories() {
    return state.data[state.mode] || (state.data[state.mode] = {});
  }
  function currentGroups() {
    return currentCategories()[state.catName] || [];
  }

  function render() {
    if (state.screen === "loading") {
      container.innerHTML = '<div class="editor-loading">Chargement…</div>';
      return;
    }
    if (state.screen === "error") {
      container.innerHTML =
        '<button type="button" class="back-btn" id="c-back-menu-error">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("c-back-menu-error").addEventListener("click", () => window.adminShowDashboard());
      return;
    }
    if (state.screen === "categories") renderCategories();
    else if (state.screen === "groups") renderGroups();
    else if (state.screen === "items") renderItems();
    else if (state.screen === "edit-group") renderEditGroup();
    else if (state.screen === "edit-item") renderEditItem();
  }

  function modeToggleHtml() {
    return (
      '<div class="mode-toggle">' +
      MODES.map(
        (m) =>
          '<button type="button" class="mode-toggle-btn' + (m === state.mode ? " is-active" : "") + '" data-mode="' + esc(m) + '">' +
          esc(m) +
          "</button>"
      ).join("") +
      "</div>"
    );
  }

  function renderCategories() {
    const cats = currentCategories();
    const names = Object.keys(cats);
    const rows = names
      .map((name) => {
        const count = cats[name].length;
        return (
          '<button type="button" class="list-row" data-cat="' + esc(name) + '">' +
          '<span class="list-row-main">' +
          '<span class="list-row-title">' + esc(name) + "</span>" +
          '<span class="list-row-sub">' + count + " groupe" + (count > 1 ? "s" : "") + "</span>" +
          "</span>" +
          '<span class="list-row-arrow">›</span>' +
          "</button>"
        );
      })
      .join("");

    container.innerHTML =
      '<button type="button" class="back-btn" id="c-back-menu">‹ Retour</button>' +
      "<h1>La carte</h1>" +
      modeToggleHtml() +
      '<div class="list">' + (rows || '<p class="dashboard-note">Aucune catégorie.</p>') + "</div>" +
      '<button type="button" class="btn-secondary" id="c-add-cat">+ Nouvelle catégorie</button>' +
      saveStatusHtml();

    document.getElementById("c-back-menu").addEventListener("click", () => window.adminShowDashboard());
    container.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode;
        render();
      });
    });
    document.getElementById("c-add-cat").addEventListener("click", addCategory);
    container.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.catName = btn.dataset.cat;
        state.screen = "groups";
        render();
      });
    });
  }

  function addCategory() {
    const name = prompt("Nom de la nouvelle catégorie :");
    if (!name || !name.trim()) return;
    const cats = currentCategories();
    if (cats[name.trim()]) return;
    cats[name.trim()] = [];
    persist("categories");
  }

  function renderGroups() {
    const groups = currentGroups();
    const rows = groups
      .map((g, i) => {
        const count = g.items.length;
        return (
          '<button type="button" class="list-row" data-group="' + i + '">' +
          '<span class="list-row-main">' +
          '<span class="list-row-title">' + esc(g.title) + "</span>" +
          '<span class="list-row-sub">' + count + " plat" + (count > 1 ? "s" : "") + "</span>" +
          "</span>" +
          '<span class="list-row-arrow">›</span>' +
          "</button>"
        );
      })
      .join("");

    container.innerHTML =
      '<button type="button" class="back-btn" id="c-back-cats">‹ La carte</button>' +
      '<div class="editor-header-row">' +
      "<h1>" + esc(state.catName) + "</h1>" +
      '<button type="button" class="icon-btn" id="c-rename-cat" aria-label="Renommer la catégorie">✎</button>' +
      '<button type="button" class="icon-btn icon-btn-danger" id="c-delete-cat" aria-label="Supprimer la catégorie">🗑</button>' +
      "</div>" +
      '<div class="list">' + (rows || '<p class="dashboard-note">Aucun groupe dans cette catégorie.</p>') + "</div>" +
      '<button type="button" class="btn-secondary" id="c-add-group">+ Nouveau groupe</button>' +
      saveStatusHtml();

    document.getElementById("c-back-cats").addEventListener("click", () => {
      state.screen = "categories";
      render();
    });
    document.getElementById("c-rename-cat").addEventListener("click", renameCategory);
    document.getElementById("c-delete-cat").addEventListener("click", deleteCategory);
    document.getElementById("c-add-group").addEventListener("click", () => {
      state.groupIndex = null;
      state.screen = "edit-group";
      render();
    });
    container.querySelectorAll("[data-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.groupIndex = Number(btn.dataset.group);
        state.screen = "items";
        render();
      });
    });
  }

  function renameCategory() {
    const cats = currentCategories();
    const name = prompt("Nouveau nom de la catégorie :", state.catName);
    if (!name || !name.trim() || name.trim() === state.catName) return;
    if (cats[name.trim()]) {
      alert("Une catégorie porte déjà ce nom.");
      return;
    }
    cats[name.trim()] = cats[state.catName];
    delete cats[state.catName];
    state.catName = name.trim();
    persist("groups");
  }

  function deleteCategory() {
    const cats = currentCategories();
    const count = cats[state.catName].length;
    if (!confirm('Supprimer la catégorie "' + state.catName + '" et ses ' + count + " groupe(s) ?")) return;
    delete cats[state.catName];
    persist("categories");
  }

  function renderItems() {
    const groups = currentGroups();
    const group = groups[state.groupIndex];
    const rows = group.items
      .map((item, i) => {
        return (
          '<div class="list-row-wrap" data-row="' + i + '">' +
          '<span class="drag-handle" draggable="true" data-drag="' + i + '" aria-label="Glisser pour réorganiser">⠿</span>' +
          '<button type="button" class="list-row" data-item="' + i + '">' +
          '<span class="list-row-main">' +
          '<span class="list-row-title">' + esc(item.name) + "</span>" +
          '<span class="list-row-sub">' + esc(item.price || "") + "</span>" +
          "</span>" +
          '<span class="list-row-arrow">›</span>' +
          "</button>" +
          "</div>"
        );
      })
      .join("");

    container.innerHTML =
      '<button type="button" class="back-btn" id="c-back-groups">‹ ' + esc(state.catName) + "</button>" +
      '<div class="editor-header-row">' +
      "<h1>" + esc(group.title) + "</h1>" +
      '<button type="button" class="icon-btn" id="c-edit-group" aria-label="Modifier le groupe">✎</button>' +
      '<button type="button" class="icon-btn icon-btn-danger" id="c-delete-group" aria-label="Supprimer le groupe">🗑</button>' +
      "</div>" +
      (group.note ? '<p class="dashboard-note">' + esc(group.note) + "</p>" : "") +
      '<div class="list">' + (rows || '<p class="dashboard-note">Aucun plat dans ce groupe.</p>') + "</div>" +
      '<button type="button" class="btn-secondary" id="c-add-item">+ Nouveau plat</button>' +
      saveStatusHtml();

    document.getElementById("c-back-groups").addEventListener("click", () => {
      state.screen = "groups";
      render();
    });
    document.getElementById("c-edit-group").addEventListener("click", () => {
      state.screen = "edit-group";
      render();
    });
    document.getElementById("c-delete-group").addEventListener("click", () => {
      if (!confirm('Supprimer le groupe "' + group.title + '" et ses ' + group.items.length + " plat(s) ?")) return;
      groups.splice(state.groupIndex, 1);
      state.groupIndex = null;
      persist("groups");
    });
    document.getElementById("c-add-item").addEventListener("click", () => {
      state.itemIndex = null;
      state.screen = "edit-item";
      render();
    });
    container.querySelectorAll("[data-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.itemIndex = Number(btn.dataset.item);
        state.screen = "edit-item";
        render();
      });
    });
    setupDragAndDrop(group.items);
  }

  function setupDragAndDrop(items) {
    const rows = container.querySelectorAll(".list-row-wrap");
    let dragFrom = null;

    rows.forEach((row) => {
      const handle = row.querySelector(".drag-handle");

      handle.addEventListener("dragstart", (e) => {
        dragFrom = Number(row.dataset.row);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(dragFrom));
        row.classList.add("dragging");
      });
      handle.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        rows.forEach((r) => r.classList.remove("drag-over"));
        dragFrom = null;
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragFrom === null || Number(row.dataset.row) === dragFrom) return;
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("drag-over");
        const to = Number(row.dataset.row);
        if (dragFrom === null || to === dragFrom) return;
        const [moved] = items.splice(dragFrom, 1);
        items.splice(to, 0, moved);
        persist("items");
      });
    });
  }

  function renderEditGroup() {
    const groups = currentGroups();
    const isNew = state.groupIndex === null;
    const group = isNew ? { title: "", note: "", price: "", items: [] } : groups[state.groupIndex];

    container.innerHTML =
      '<button type="button" class="back-btn" id="cg-back">‹ Retour</button>' +
      "<h1>" + (isNew ? "Nouveau groupe" : "Modifier le groupe") + "</h1>" +
      '<form id="cg-form">' +
      '<label class="field-label" for="cg-title">Titre</label>' +
      '<input class="field" id="cg-title" required value="' + esc(group.title) + '">' +
      '<label class="field-label" for="cg-note">Note (optionnelle)</label>' +
      '<input class="field" id="cg-note" placeholder="Servi avec frites maison et salade." value="' + esc(group.note || "") + '">' +
      '<label class="field-label" for="cg-price">Prix du groupe (optionnel)</label>' +
      '<input class="field" id="cg-price" placeholder="12,90 €" value="' + esc(group.price || "") + '">' +
      '<button type="submit" class="btn-primary" id="cg-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      "</form>";

    document.getElementById("cg-back").addEventListener("click", () => {
      state.screen = isNew ? "groups" : "items";
      state.saveError = null;
      render();
    });

    document.getElementById("cg-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("cg-title").value.trim();
      const note = document.getElementById("cg-note").value.trim();
      const price = document.getElementById("cg-price").value.trim();

      const newGroup = { title, items: group.items };
      if (note) newGroup.note = note;
      if (price) newGroup.price = price;

      if (isNew) {
        groups.push(newGroup);
        state.groupIndex = groups.length - 1;
      } else {
        groups[state.groupIndex] = newGroup;
      }
      await persist("items");
    });
  }

  function renderEditItem() {
    const groups = currentGroups();
    const group = groups[state.groupIndex];
    const isNew = state.itemIndex === null;
    const item = isNew ? { name: "", desc: "", price: "" } : group.items[state.itemIndex];

    container.innerHTML =
      '<button type="button" class="back-btn" id="ci-back">‹ ' + esc(group.title) + "</button>" +
      "<h1>" + (isNew ? "Nouveau plat" : "Modifier le plat") + "</h1>" +
      '<form id="ci-form">' +
      '<label class="field-label" for="ci-name">Nom</label>' +
      '<input class="field" id="ci-name" required value="' + esc(item.name) + '">' +
      '<label class="field-label" for="ci-desc">Description</label>' +
      '<input class="field" id="ci-desc" value="' + esc(item.desc || "") + '">' +
      '<label class="field-label" for="ci-price">Prix</label>' +
      '<input class="field" id="ci-price" placeholder="16 €" value="' + esc(item.price || "") + '">' +
      '<button type="submit" class="btn-primary" id="ci-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (!isNew
        ? '<button type="button" class="btn-danger" id="ci-delete"' + (state.saving ? " disabled" : "") + ">Supprimer ce plat</button>"
        : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      "</form>";

    document.getElementById("ci-back").addEventListener("click", () => {
      state.screen = "items";
      state.saveError = null;
      render();
    });

    document.getElementById("ci-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const newItem = {
        name: document.getElementById("ci-name").value.trim(),
        desc: document.getElementById("ci-desc").value.trim(),
        price: document.getElementById("ci-price").value.trim(),
      };
      if (isNew) group.items.push(newItem);
      else group.items[state.itemIndex] = newItem;
      await persist("items");
    });

    if (!isNew) {
      document.getElementById("ci-delete").addEventListener("click", async () => {
        if (!confirm("Supprimer ce plat ?")) return;
        group.items.splice(state.itemIndex, 1);
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

  window.CarteEditor = {
    async open() {
      state = {
        screen: "loading",
        data: {},
        mode: MODES[0],
        catName: null,
        groupIndex: null,
        itemIndex: null,
        saving: false,
        saveError: null,
      };
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
