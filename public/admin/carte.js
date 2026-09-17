"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("carte-view");
  const MODES = ["Sur place", "À emporter"];

  let state = null;
  let draftSaveTimer = null;
  let draftTickTimer = null;

  function stopDraftTicker() {
    if (draftTickTimer) { clearInterval(draftTickTimer); draftTickTimer = null; }
  }

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

  function restoreCategories() {
    const cats = currentCategories();
    const restorable = state.deletedCategories.filter((d) => d.mode === state.mode);
    restorable.slice().reverse().forEach((d) => { if (!cats[d.catName]) cats[d.catName] = d.groups; });
    state.deletedCategories = state.deletedCategories.filter((d) => d.mode !== state.mode);
    persist("categories");
  }

  function moveCategoryTo(fromIndex, toIndex) {
    const cats = currentCategories();
    const names = Object.keys(cats);
    const [movedName] = names.splice(fromIndex, 1);
    names.splice(toIndex, 0, movedName);
    const reordered = {};
    names.forEach((name) => { reordered[name] = cats[name]; });
    state.data[state.mode] = reordered;
    persist("categories");
  }

  function renderCategories() {
    const cats = currentCategories();
    const names = Object.keys(cats);
    const restorableCatsCount = state.deletedCategories.filter((d) => d.mode === state.mode).length;
    const rows = names
      .map((name, i) => {
        const count = cats[name].length;
        return (
          '<div class="list-row-wrap" data-row="' + i + '">' +
          '<span class="drag-handle" draggable="true" data-drag="' + i + '" aria-label="Glisser pour réorganiser">⠿</span>' +
          '<button type="button" class="list-row" data-cat="' + esc(name) + '">' +
          '<span class="list-row-main">' +
          '<span class="list-row-title">' + esc(name) + "</span>" +
          '<span class="list-row-sub">' + count + " groupe" + (count > 1 ? "s" : "") + "</span>" +
          "</span>" +
          '<span class="list-row-arrow">›</span>' +
          "</button>" +
          "</div>"
        );
      })
      .join("");

    container.innerHTML =
      '<button type="button" class="back-btn" id="c-back-menu">‹ Retour</button>' +
      "<h1>La carte</h1>" +
      modeToggleHtml() +
      '<div class="list">' + (rows || '<p class="dashboard-note">Aucune catégorie.</p>') + "</div>" +
      '<div style="display:flex; gap:10px; align-items:center;">' +
      '<button type="button" class="btn-secondary" id="c-add-cat">+ Nouvelle catégorie</button>' +
      (restorableCatsCount > 0
        ? '<button type="button" class="icon-btn icon-btn-restore" id="c-restore-cats" title="Restaurer les catégories supprimées" aria-label="Restaurer les catégories supprimées">↺</button>'
        : "") +
      "</div>" +
      saveStatusHtml();

    document.getElementById("c-back-menu").addEventListener("click", () => window.adminShowDashboard());
    container.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode;
        render();
      });
    });
    document.getElementById("c-add-cat").addEventListener("click", addCategory);
    if (restorableCatsCount > 0) {
      document.getElementById("c-restore-cats").addEventListener("click", restoreCategories);
    }
    container.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.catName = btn.dataset.cat;
        state.screen = "groups";
        render();
      });
    });
    setupDragAndDrop(moveCategoryTo);
  }

  function addCategory() {
    const name = prompt("Nom de la nouvelle catégorie :");
    if (!name || !name.trim()) return;
    const cats = currentCategories();
    if (cats[name.trim()]) return;
    cats[name.trim()] = [];
    persist("categories");
  }

  function matchesCurrentCategory(d) {
    return d.mode === state.mode && d.catName === state.catName;
  }

  function restoreGroups() {
    const groups = currentGroups();
    const restorable = state.deletedGroups.filter(matchesCurrentCategory);
    restorable.slice().reverse().forEach((d) => { groups.splice(Math.min(d.index, groups.length), 0, d.group); });
    state.deletedGroups = state.deletedGroups.filter((d) => !matchesCurrentCategory(d));
    persist("groups");
  }

  function renderGroups() {
    const groups = currentGroups();
    const restorableGroupsCount = state.deletedGroups.filter(matchesCurrentCategory).length;
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
      (restorableGroupsCount > 0
        ? '<button type="button" class="icon-btn icon-btn-restore" id="c-restore-groups" title="Restaurer les groupes supprimés" aria-label="Restaurer les groupes supprimés">↺</button>'
        : "") +
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
    if (restorableGroupsCount > 0) {
      document.getElementById("c-restore-groups").addEventListener("click", restoreGroups);
    }
    document.getElementById("c-add-group").addEventListener("click", () => {
      state.groupIndex = null;
      state.draftChecked = false;
      state.restoredFields = null;
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
    state.deletedCategories.push({ mode: state.mode, catName: state.catName, groups: cats[state.catName] });
    delete cats[state.catName];
    persist("categories");
  }

  function matchesCurrentGroup(d) {
    return d.mode === state.mode && d.catName === state.catName && d.groupIndex === state.groupIndex;
  }

  function restoreItems() {
    const groups = currentGroups();
    const group = groups[state.groupIndex];
    const restorable = state.deletedItems.filter(matchesCurrentGroup);
    restorable.slice().reverse().forEach((d) => { group.items.splice(Math.min(d.index, group.items.length), 0, d.item); });
    state.deletedItems = state.deletedItems.filter((d) => !matchesCurrentGroup(d));
    persist("items");
  }

  function renderItems() {
    const groups = currentGroups();
    const group = groups[state.groupIndex];
    const restorableCount = state.deletedItems.filter(matchesCurrentGroup).length;
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
      (restorableCount > 0
        ? '<button type="button" class="icon-btn icon-btn-restore" id="c-restore-items" title="Restaurer les plats supprimés" aria-label="Restaurer les plats supprimés">↺</button>'
        : "") +
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
      state.draftChecked = false;
      state.restoredFields = null;
      state.screen = "edit-group";
      render();
    });
    if (restorableCount > 0) {
      document.getElementById("c-restore-items").addEventListener("click", restoreItems);
    }
    document.getElementById("c-delete-group").addEventListener("click", () => {
      if (!confirm('Supprimer le groupe "' + group.title + '" et ses ' + group.items.length + " plat(s) ?")) return;
      state.deletedGroups.push({ mode: state.mode, catName: state.catName, index: state.groupIndex, group });
      groups.splice(state.groupIndex, 1);
      state.groupIndex = null;
      persist("groups");
    });
    document.getElementById("c-add-item").addEventListener("click", () => {
      state.itemIndex = null;
      state.draftChecked = false;
      state.restoredFields = null;
      state.screen = "edit-item";
      render();
    });
    container.querySelectorAll("[data-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.itemIndex = Number(btn.dataset.item);
        state.draftChecked = false;
        state.restoredFields = null;
        state.screen = "edit-item";
        render();
      });
    });
    setupDragAndDrop((from, to) => {
      const [moved] = group.items.splice(from, 1);
      group.items.splice(to, 0, moved);
      persist("items");
    });
  }

  function setupDragAndDrop(onMove) {
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
        onMove(dragFrom, to);
      });
    });
  }

  function groupDraftKey() {
    return "carte-group:" + state.mode + ":" + state.catName + ":" + (state.groupIndex === null ? "new" : state.groupIndex);
  }

  function readGroupFields() {
    return {
      title: document.getElementById("cg-title").value,
      note: document.getElementById("cg-note").value,
      price: document.getElementById("cg-price").value,
    };
  }

  function scheduleGroupDraftSave() {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => {
      window.AdminDrafts.save(groupDraftKey(), readGroupFields());
      const statusEl = document.getElementById("cg-draft-status");
      if (statusEl) statusEl.textContent = "Brouillon enregistré automatiquement — à l'instant";
    }, 800);
  }

  function renderEditGroup() {
    const groups = currentGroups();
    const isNew = state.groupIndex === null;
    const group = isNew ? { title: "", note: "", price: "", items: [] } : groups[state.groupIndex];
    const formFields = state.restoredFields || group;

    if (!state.draftChecked) {
      state.draftChecked = true;
      state.pendingDraft = window.AdminDrafts.load(groupDraftKey());
    }

    container.innerHTML =
      '<button type="button" class="back-btn" id="cg-back">‹ Retour</button>' +
      "<h1>" + (isNew ? "Nouveau groupe" : "Modifier le groupe") + "</h1>" +
      (state.pendingDraft
        ? '<div class="draft-banner">Un brouillon non enregistré existe pour ce formulaire (' + window.AdminDrafts.timeAgo(state.pendingDraft.savedAt) + ').' +
          '<div class="draft-banner-actions">' +
          '<button type="button" class="draft-banner-btn" id="cg-draft-restore">Restaurer le brouillon</button>' +
          '<button type="button" class="draft-banner-btn draft-banner-btn-ghost" id="cg-draft-ignore">Ignorer</button>' +
          "</div></div>"
        : "") +
      '<form id="cg-form">' +
      '<label class="field-label" for="cg-title">Titre</label>' +
      '<input class="field" id="cg-title" required value="' + esc(formFields.title) + '">' +
      '<label class="field-label" for="cg-note">Note (optionnelle)</label>' +
      '<input class="field" id="cg-note" placeholder="Servi avec frites maison et salade." value="' + esc(formFields.note || "") + '">' +
      '<label class="field-label" for="cg-price">Prix du groupe (optionnel)</label>' +
      '<input class="field" id="cg-price" placeholder="12,90 €" value="' + esc(formFields.price || "") + '">' +
      '<button type="submit" class="btn-primary" id="cg-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      '<div id="cg-draft-status" class="dashboard-note" style="margin-top:10px;"></div>' +
      "</form>";

    document.getElementById("cg-back").addEventListener("click", () => {
      stopDraftTicker();
      state.screen = isNew ? "groups" : "items";
      state.saveError = null;
      render();
    });

    if (state.pendingDraft) {
      document.getElementById("cg-draft-restore").addEventListener("click", () => {
        const d = state.pendingDraft.data;
        state.restoredFields = { title: d.title || "", note: d.note || "", price: d.price || "" };
        state.pendingDraft = null;
        render();
      });
      document.getElementById("cg-draft-ignore").addEventListener("click", () => {
        window.AdminDrafts.clear(groupDraftKey());
        state.pendingDraft = null;
        render();
      });
    }

    document.getElementById("cg-form").addEventListener("input", scheduleGroupDraftSave);

    stopDraftTicker();
    draftTickTimer = setInterval(() => {
      const draft = window.AdminDrafts.load(groupDraftKey());
      const statusEl = document.getElementById("cg-draft-status");
      if (draft && statusEl) statusEl.textContent = "Brouillon enregistré automatiquement — " + window.AdminDrafts.timeAgo(draft.savedAt);
    }, 5000);

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
      window.AdminDrafts.clear(groupDraftKey());
      stopDraftTicker();
      await persist("items");
    });
  }

  function itemDraftKey() {
    return "carte-item:" + state.mode + ":" + state.catName + ":" + state.groupIndex + ":" + (state.itemIndex === null ? "new" : state.itemIndex);
  }

  function readItemFields() {
    return {
      name: document.getElementById("ci-name").value,
      desc: document.getElementById("ci-desc").value,
      price: document.getElementById("ci-price").value,
    };
  }

  function scheduleItemDraftSave() {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => {
      window.AdminDrafts.save(itemDraftKey(), readItemFields());
      const statusEl = document.getElementById("ci-draft-status");
      if (statusEl) statusEl.textContent = "Brouillon enregistré automatiquement — à l'instant";
    }, 800);
  }

  function renderEditItem() {
    const groups = currentGroups();
    const group = groups[state.groupIndex];
    const isNew = state.itemIndex === null;
    const item = state.restoredFields || (isNew ? { name: "", desc: "", price: "" } : group.items[state.itemIndex]);

    if (!state.draftChecked) {
      state.draftChecked = true;
      state.pendingDraft = window.AdminDrafts.load(itemDraftKey());
    }

    container.innerHTML =
      '<button type="button" class="back-btn" id="ci-back">‹ ' + esc(group.title) + "</button>" +
      "<h1>" + (isNew ? "Nouveau plat" : "Modifier le plat") + "</h1>" +
      (state.pendingDraft
        ? '<div class="draft-banner">Un brouillon non enregistré existe pour ce formulaire (' + window.AdminDrafts.timeAgo(state.pendingDraft.savedAt) + ').' +
          '<div class="draft-banner-actions">' +
          '<button type="button" class="draft-banner-btn" id="ci-draft-restore">Restaurer le brouillon</button>' +
          '<button type="button" class="draft-banner-btn draft-banner-btn-ghost" id="ci-draft-ignore">Ignorer</button>' +
          "</div></div>"
        : "") +
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
      '<div id="ci-draft-status" class="dashboard-note" style="margin-top:10px;"></div>' +
      "</form>";

    document.getElementById("ci-back").addEventListener("click", () => {
      stopDraftTicker();
      state.screen = "items";
      state.saveError = null;
      render();
    });

    if (state.pendingDraft) {
      document.getElementById("ci-draft-restore").addEventListener("click", () => {
        const d = state.pendingDraft.data;
        state.restoredFields = { name: d.name || "", desc: d.desc || "", price: d.price || "" };
        state.pendingDraft = null;
        render();
      });
      document.getElementById("ci-draft-ignore").addEventListener("click", () => {
        window.AdminDrafts.clear(itemDraftKey());
        state.pendingDraft = null;
        render();
      });
    }

    document.getElementById("ci-form").addEventListener("input", scheduleItemDraftSave);

    stopDraftTicker();
    draftTickTimer = setInterval(() => {
      const draft = window.AdminDrafts.load(itemDraftKey());
      const statusEl = document.getElementById("ci-draft-status");
      if (draft && statusEl) statusEl.textContent = "Brouillon enregistré automatiquement — " + window.AdminDrafts.timeAgo(draft.savedAt);
    }, 5000);

    document.getElementById("ci-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const newItem = {
        name: document.getElementById("ci-name").value.trim(),
        desc: document.getElementById("ci-desc").value.trim(),
        price: document.getElementById("ci-price").value.trim(),
      };
      if (isNew) group.items.push(newItem);
      else group.items[state.itemIndex] = newItem;
      window.AdminDrafts.clear(itemDraftKey());
      stopDraftTicker();
      await persist("items");
    });

    if (!isNew) {
      document.getElementById("ci-delete").addEventListener("click", async () => {
        if (!confirm("Supprimer ce plat ?")) return;
        state.deletedItems.push({ mode: state.mode, catName: state.catName, groupIndex: state.groupIndex, index: state.itemIndex, item: group.items[state.itemIndex] });
        group.items.splice(state.itemIndex, 1);
        window.AdminDrafts.clear(itemDraftKey());
        stopDraftTicker();
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
    state.itemIndex = null;
    state.screen = nextScreen;
    render();
    try {
      await apiSave(state.data);
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
        deletedItems: [],
        deletedGroups: [],
        deletedCategories: [],
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
