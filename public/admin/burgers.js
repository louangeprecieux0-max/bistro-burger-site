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
    const rows = cat.items
      .map((item, i) => {
        const meta = [];
        if (item.sur) meta.push(item.sur + " sur place");
        if (item.emp) meta.push(item.emp + " à emporter");
        return (
          '<div class="list-row-wrap" data-row="' + i + '">' +
          '<span class="drag-handle" draggable="true" data-drag="' + i + '" aria-label="Glisser pour réorganiser">⠿</span>' +
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
      state.editImgUrl = undefined;
      state.screen = "edit";
      render();
    });
    container.querySelectorAll("[data-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.itemIndex = Number(btn.dataset.item);
        state.editImgUrl = undefined;
        state.screen = "edit";
        render();
      });
    });
    setupDragAndDrop();
  }

  function setupDragAndDrop() {
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

      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over");
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("drag-over");
        const to = Number(row.dataset.row);
        if (dragFrom === null || to === dragFrom) return;
        moveItemTo(dragFrom, to);
      });
    });
  }

  function moveItemTo(fromIndex, toIndex) {
    const items = state.data[state.catIndex].items;
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    persist("items");
  }

  const IMAGE_BUCKET = "site-images";
  const EXT_BY_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  async function uploadImage(file) {
    state.uploadingImg = true;
    state.uploadError = null;
    render();
    try {
      const ext = EXT_BY_TYPE[file.type];
      if (!ext) throw new Error("Format non pris en charge. Utilisez JPG, PNG, WebP ou GIF.");
      if (file.size > MAX_IMAGE_BYTES) throw new Error("Image trop lourde (8 Mo maximum).");

      const path = crypto.randomUUID() + "." + ext;
      const { error } = await window.adminAuth.supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);

      const { data } = window.adminAuth.supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
      state.editImgUrl = data.publicUrl;
    } catch (err) {
      state.uploadError = err.message;
    } finally {
      state.uploadingImg = false;
      render();
    }
  }

  function renderEdit() {
    const cat = state.data[state.catIndex];
    const isNew = state.itemIndex === null;
    const item = isNew ? { name: "", desc: "", sur: "", emp: "", img: "" } : cat.items[state.itemIndex];
    if (state.editImgUrl === undefined) state.editImgUrl = item.img || "";

    const imgPreview = state.editImgUrl
      ? '<img class="image-preview" src="' + esc(state.editImgUrl) + '" alt="">'
      : '<div class="image-preview image-preview-empty">Aucune image</div>';

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
      '<label class="field-label">Image</label>' +
      '<div class="image-field">' +
      imgPreview +
      '<div class="image-field-actions">' +
      '<input type="file" id="b-img-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden' + (state.uploadingImg ? " disabled" : "") + ">" +
      '<button type="button" class="btn-secondary" id="b-img-pick"' + (state.uploadingImg ? " disabled" : "") + ">" +
      (state.uploadingImg ? "Téléversement…" : state.editImgUrl ? "Changer l'image" : "Choisir une image") +
      "</button>" +
      (state.editImgUrl && !state.uploadingImg
        ? '<button type="button" class="btn-ghost-danger" id="b-img-remove">Retirer</button>'
        : "") +
      "</div>" +
      (state.uploadError ? '<div class="login-error">' + esc(state.uploadError) + "</div>" : "") +
      "</div>" +
      '<button type="submit" class="btn-primary" id="b-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (!isNew
        ? '<button type="button" class="btn-danger" id="b-delete-item"' + (state.saving ? " disabled" : "") + ">Supprimer ce burger</button>"
        : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      "</form>";

    document.getElementById("b-img-pick").addEventListener("click", () => {
      document.getElementById("b-img-file").click();
    });
    document.getElementById("b-img-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) uploadImage(file);
    });
    if (state.editImgUrl && !state.uploadingImg) {
      document.getElementById("b-img-remove").addEventListener("click", () => {
        state.editImgUrl = "";
        render();
      });
    }

    document.getElementById("b-back-items").addEventListener("click", () => {
      state.screen = "items";
      state.saveError = null;
      state.editImgUrl = undefined;
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
      if (state.editImgUrl) newItem.img = state.editImgUrl;

      if (isNew) cat.items.push(newItem);
      else cat.items[state.itemIndex] = newItem;

      state.editImgUrl = undefined;
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
