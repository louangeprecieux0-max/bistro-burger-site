"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("burgerdumoment-view");

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
    const res = await fetch(API_URL + "?key=burger_du_moment", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return (json.value && Array.isArray(json.value.items)) ? json.value.items : [];
  }

  async function apiSave(items) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ key: "burger_du_moment", value: { items } }),
    });
    if (!res.ok) throw new Error("Échec de l'enregistrement.");
    const json = await res.json();
    if (json.deployTriggered === false) {
      throw new Error(
        "Enregistré, mais la republication du site a échoué. Contactez la personne qui gère le site."
      );
    }
  }

  const IMAGE_BUCKET = "site-images";
  const EXT_BY_TYPE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
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

  function render() {
    if (state.screen === "loading") {
      container.innerHTML = '<div class="editor-loading">Chargement…</div>';
      return;
    }
    if (state.screen === "error") {
      container.innerHTML =
        '<button type="button" class="back-btn" id="bdm-back-menu-error">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("bdm-back-menu-error").addEventListener("click", () => window.adminShowDashboard());
      return;
    }
    if (state.screen === "list") renderList();
    else renderEdit();
  }

  function restoreItems() {
    state.deletedItems.slice().reverse().forEach((d) => { state.data.splice(Math.min(d.index, state.data.length), 0, d.item); });
    state.deletedItems = [];
    persist();
  }

  function renderList() {
    const rows = state.data
      .map((item, i) => (
        '<button type="button" class="list-row" data-item="' + i + '">' +
        '<span class="list-row-main">' +
        '<span class="list-row-title">' + esc(item.name || "Sans nom") + (item.active ? ' <span class="list-row-active-tag">Actif</span>' : "") + "</span>" +
        '<span class="list-row-sub">' + esc([item.sur, item.emp].filter(Boolean).join(" · ")) + "</span>" +
        "</span>" +
        '<span class="list-row-arrow">›</span>' +
        "</button>"
      ))
      .join("");

    container.innerHTML =
      '<button type="button" class="back-btn" id="bdm-back-menu">‹ Retour au menu</button>' +
      "<h1>Burger du moment</h1>" +
      '<p class="dashboard-note">Un seul burger peut être actif à la fois : il s\'affiche en avant sur la page publique. Les autres restent enregistrés et peuvent être réactivés plus tard.</p>' +
      '<div class="list">' + (rows || '<p class="dashboard-note">Aucun burger du moment pour l\'instant.</p>') + "</div>" +
      '<div style="display:flex; gap:10px; align-items:center;">' +
      '<button type="button" class="btn-secondary" id="bdm-add">+ Nouveau burger du moment</button>' +
      (state.deletedItems.length > 0
        ? '<button type="button" class="icon-btn icon-btn-restore" id="bdm-restore-items" title="Restaurer les burgers du moment supprimés" aria-label="Restaurer les burgers du moment supprimés">↺</button>'
        : "") +
      "</div>" +
      saveStatusHtml();

    document.getElementById("bdm-back-menu").addEventListener("click", () => window.adminShowDashboard());
    document.getElementById("bdm-add").addEventListener("click", () => {
      state.itemIndex = null;
      state.editImgUrl = undefined;
      state.draftChecked = false;
      state.screen = "edit";
      render();
    });
    if (state.deletedItems.length > 0) {
      document.getElementById("bdm-restore-items").addEventListener("click", restoreItems);
    }
    container.querySelectorAll("[data-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.itemIndex = Number(btn.dataset.item);
        state.editImgUrl = undefined;
        state.draftChecked = false;
        state.screen = "edit";
        render();
      });
    });
  }

  function bdmDraftKey() {
    return "bdm:" + (state.itemIndex === null ? "new" : state.itemIndex);
  }

  function readEditFields() {
    return {
      name: document.getElementById("bdm-f-name").value,
      description: document.getElementById("bdm-f-desc").value,
      ingredients: document.getElementById("bdm-f-ingredients").value,
      sur: document.getElementById("bdm-f-sur").value,
      emp: document.getElementById("bdm-f-emp").value,
      allergens: document.getElementById("bdm-f-allergens").value,
      available: document.getElementById("bdm-f-available").checked,
      active: document.getElementById("bdm-f-active").checked,
      img: state.editImgUrl || "",
    };
  }

  function scheduleDraftSave() {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => {
      window.AdminDrafts.save(bdmDraftKey(), readEditFields());
      const statusEl = document.getElementById("bdm-draft-status");
      if (statusEl) statusEl.textContent = "Brouillon enregistré automatiquement — à l'instant";
    }, 800);
  }

  function renderEdit() {
    const isNew = state.itemIndex === null;
    const item = isNew
      ? { name: "", description: "", ingredients: "", sur: "", emp: "", allergens: "", available: true, active: false, img: "" }
      : state.data[state.itemIndex];
    if (state.editImgUrl === undefined) state.editImgUrl = item.img || "";

    if (!state.draftChecked) {
      state.draftChecked = true;
      state.pendingDraft = window.AdminDrafts.load(bdmDraftKey());
    }

    const imgPreview = state.editImgUrl
      ? '<img class="edit-hero-img" src="' + esc(state.editImgUrl) + '" alt="">'
      : '<div class="edit-hero-empty">Aucune image</div>';

    container.innerHTML =
      '<button type="button" class="back-btn" id="bdm-back-list">‹ Burger du moment</button>' +
      "<h1>" + (isNew ? "Nouveau burger du moment" : "Modifier le burger du moment") + "</h1>" +
      (state.pendingDraft
        ? '<div class="draft-banner">Un brouillon non enregistré existe pour ce formulaire (' + window.AdminDrafts.timeAgo(state.pendingDraft.savedAt) + ').' +
          '<div class="draft-banner-actions">' +
          '<button type="button" class="draft-banner-btn" id="bdm-draft-restore">Restaurer le brouillon</button>' +
          '<button type="button" class="draft-banner-btn draft-banner-btn-ghost" id="bdm-draft-ignore">Ignorer</button>' +
          "</div></div>"
        : "") +
      '<div class="edit-hero">' +
      imgPreview +
      '<div class="edit-hero-body">' +
      '<input type="file" id="bdm-img-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden' + (state.uploadingImg ? " disabled" : "") + ">" +
      '<button type="button" class="edit-hero-btn" id="bdm-img-pick"' + (state.uploadingImg ? " disabled" : "") + ">" +
      (state.uploadingImg ? "Téléversement…" : "Modifier") +
      "</button>" +
      (state.editImgUrl && !state.uploadingImg
        ? '<button type="button" class="edit-hero-remove" id="bdm-img-remove">Retirer l\'image</button>'
        : "") +
      (state.uploadError ? '<div class="login-error">' + esc(state.uploadError) + "</div>" : "") +
      '<p class="edit-hero-hint">Image du burger<br>Format recommandé : <strong>JPG ou WebP</strong><br>Dimensions recommandées : <strong>1200 × 900&nbsp;px</strong> (format 4:3)<br>Poids maximal : 8 Mo</p>' +
      "</div>" +
      "</div>" +
      '<form id="bdm-item-form">' +
      '<label class="field-label" for="bdm-f-name">Nom</label>' +
      '<input class="field" id="bdm-f-name" required value="' + esc(item.name) + '">' +
      '<label class="field-label" for="bdm-f-desc">Description</label>' +
      '<input class="field" id="bdm-f-desc" value="' + esc(item.description) + '">' +
      '<label class="field-label" for="bdm-f-ingredients">Ingrédients / composition</label>' +
      '<input class="field" id="bdm-f-ingredients" placeholder="Bun\'s², steak, cheddar..." value="' + esc(item.ingredients) + '">' +
      '<label class="field-label" for="bdm-f-sur">Prix sur place</label>' +
      '<input class="field" id="bdm-f-sur" placeholder="16 €" value="' + esc(item.sur) + '">' +
      '<label class="field-label" for="bdm-f-emp">Prix à emporter</label>' +
      '<input class="field" id="bdm-f-emp" placeholder="14 €" value="' + esc(item.emp) + '">' +
      '<label class="field-label" for="bdm-f-allergens">Allergènes (optionnel)</label>' +
      '<input class="field" id="bdm-f-allergens" placeholder="Ex : gluten, lait, œuf" value="' + esc(item.allergens) + '">' +
      '<p class="dashboard-note" style="margin-top:-4px;">Laissez vide tant que les allergènes n\'ont pas été validés : rien ne s\'affichera sur le site plutôt qu\'une information incorrecte.</p>' +
      '<label class="admin-checkbox" style="margin-top:14px;"><input type="checkbox" id="bdm-f-available"' + (item.available !== false ? " checked" : "") + '> Disponible actuellement</label>' +
      '<label class="admin-checkbox"><input type="checkbox" id="bdm-f-active"' + (item.active ? " checked" : "") + '> Actif (mis en avant sur le site)</label>' +
      '<p class="dashboard-note" style="margin-top:6px;">Activer ce burger désactivera automatiquement l\'éventuel burger du moment actif actuellement.</p>' +
      '<button type="submit" class="btn-primary" id="bdm-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (!isNew
        ? '<button type="button" class="btn-danger" id="bdm-delete-item"' + (state.saving ? " disabled" : "") + ">Supprimer</button>"
        : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      '<div id="bdm-draft-status" class="dashboard-note" style="margin-top:10px;"></div>' +
      "</form>";

    document.getElementById("bdm-img-pick").addEventListener("click", () => {
      document.getElementById("bdm-img-file").click();
    });
    document.getElementById("bdm-img-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) uploadImage(file);
    });
    if (state.editImgUrl && !state.uploadingImg) {
      document.getElementById("bdm-img-remove").addEventListener("click", () => {
        state.editImgUrl = "";
        render();
        scheduleDraftSave();
      });
    }

    if (state.pendingDraft) {
      document.getElementById("bdm-draft-restore").addEventListener("click", () => {
        const d = state.pendingDraft.data;
        document.getElementById("bdm-f-name").value = d.name || "";
        document.getElementById("bdm-f-desc").value = d.description || "";
        document.getElementById("bdm-f-ingredients").value = d.ingredients || "";
        document.getElementById("bdm-f-sur").value = d.sur || "";
        document.getElementById("bdm-f-emp").value = d.emp || "";
        document.getElementById("bdm-f-allergens").value = d.allergens || "";
        document.getElementById("bdm-f-available").checked = d.available !== false;
        document.getElementById("bdm-f-active").checked = !!d.active;
        if (d.img) state.editImgUrl = d.img;
        state.pendingDraft = null;
        render();
      });
      document.getElementById("bdm-draft-ignore").addEventListener("click", () => {
        window.AdminDrafts.clear(bdmDraftKey());
        state.pendingDraft = null;
        render();
      });
    }

    document.getElementById("bdm-item-form").addEventListener("input", scheduleDraftSave);
    document.getElementById("bdm-item-form").addEventListener("change", scheduleDraftSave);

    stopDraftTicker();
    draftTickTimer = setInterval(() => {
      const draft = window.AdminDrafts.load(bdmDraftKey());
      const statusEl = document.getElementById("bdm-draft-status");
      if (draft && statusEl) statusEl.textContent = "Brouillon enregistré automatiquement — " + window.AdminDrafts.timeAgo(draft.savedAt);
    }, 5000);

    document.getElementById("bdm-back-list").addEventListener("click", () => {
      stopDraftTicker();
      state.screen = "list";
      state.saveError = null;
      state.editImgUrl = undefined;
      render();
    });

    document.getElementById("bdm-item-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const active = document.getElementById("bdm-f-active").checked;
      const newItem = {
        name: document.getElementById("bdm-f-name").value.trim(),
        description: document.getElementById("bdm-f-desc").value.trim(),
        ingredients: document.getElementById("bdm-f-ingredients").value.trim(),
        sur: document.getElementById("bdm-f-sur").value.trim(),
        emp: document.getElementById("bdm-f-emp").value.trim(),
        allergens: document.getElementById("bdm-f-allergens").value.trim(),
        available: document.getElementById("bdm-f-available").checked,
        active,
      };
      if (state.editImgUrl) newItem.img = state.editImgUrl;

      if (active) state.data.forEach((it) => { it.active = false; });

      if (isNew) state.data.push(newItem);
      else state.data[state.itemIndex] = newItem;

      state.editImgUrl = undefined;
      window.AdminDrafts.clear(bdmDraftKey());
      stopDraftTicker();
      await persist();
    });

    if (!isNew) {
      document.getElementById("bdm-delete-item").addEventListener("click", async () => {
        if (!confirm("Supprimer définitivement ce burger du moment ?")) return;
        state.deletedItems.push({ index: state.itemIndex, item: state.data[state.itemIndex] });
        state.data.splice(state.itemIndex, 1);
        window.AdminDrafts.clear(bdmDraftKey());
        stopDraftTicker();
        await persist();
      });
    }
  }

  function saveStatusHtml() {
    if (state.saving) return '<div class="password-success">Enregistrement…</div>';
    if (state.saveError) return '<div class="login-error">' + esc(state.saveError) + "</div>";
    return "";
  }

  async function persist() {
    state.saving = true;
    state.saveError = null;
    state.itemIndex = null;
    state.screen = "list";
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

  window.BurgerDuMomentEditor = {
    async open() {
      state = { screen: "loading", data: [], itemIndex: null, saving: false, saveError: null, deletedItems: [] };
      render();
      try {
        state.data = await apiGet();
        state.screen = "list";
      } catch (err) {
        state.screen = "error";
        state.error = err.message;
      }
      render();
    },
  };
})();
