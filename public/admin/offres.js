"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("offres-view");

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
    const res = await fetch(API_URL + "?key=offres", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return json.value || [];
  }

  async function apiSave(data) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ key: "offres", value: data }),
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
        '<button type="button" class="back-btn" id="o-back-menu-error">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("o-back-menu-error").addEventListener("click", () => window.adminShowDashboard());
      return;
    }
    if (state.screen === "list") renderList();
    else if (state.screen === "edit") renderEdit();
  }

  function renderList() {
    const rows = state.data
      .map((offer, i) => {
        return (
          '<div class="list-row-wrap" data-row="' + i + '">' +
          '<span class="drag-handle" draggable="true" data-drag="' + i + '" aria-label="Glisser pour réorganiser">⠿</span>' +
          '<button type="button" class="list-row" data-item="' + i + '">' +
          '<span class="list-row-main">' +
          '<span class="list-row-title">' + esc(offer.tag || offer.title || "Offre") + "</span>" +
          '<span class="list-row-sub">' + esc(offer.title || "") + "</span>" +
          "</span>" +
          '<span class="list-row-arrow">›</span>' +
          "</button>" +
          "</div>"
        );
      })
      .join("");

    container.innerHTML =
      '<button type="button" class="back-btn" id="o-back-menu">‹ Retour</button>' +
      "<h1>Offres du moment</h1>" +
      '<p class="dashboard-note">Les cartes affichées dans la section "Offres du moment" du site.</p>' +
      '<div class="list">' + (rows || '<p class="dashboard-note">Aucune offre.</p>') + "</div>" +
      '<button type="button" class="btn-secondary" id="o-add">+ Nouvelle offre</button>' +
      saveStatusHtml();

    document.getElementById("o-back-menu").addEventListener("click", () => window.adminShowDashboard());
    document.getElementById("o-add").addEventListener("click", () => {
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
        const [moved] = state.data.splice(dragFrom, 1);
        state.data.splice(to, 0, moved);
        persist("list");
      });
    });
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
    const isNew = state.itemIndex === null;
    const offer = isNew ? { tag: "", price: "", title: "", description: "", img: "" } : state.data[state.itemIndex];
    if (state.editImgUrl === undefined) state.editImgUrl = offer.img || "";

    const imgPreview = state.editImgUrl
      ? '<img class="edit-hero-img" src="' + esc(state.editImgUrl) + '" alt="">'
      : '<div class="edit-hero-empty">Aucune image</div>';

    container.innerHTML =
      '<button type="button" class="back-btn" id="o-back">‹ Offres</button>' +
      "<h1>" + (isNew ? "Nouvelle offre" : "Modifier l'offre") + "</h1>" +
      '<div class="edit-hero">' +
      imgPreview +
      '<div class="edit-hero-body">' +
      '<input type="file" id="o-img-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden' + (state.uploadingImg ? " disabled" : "") + ">" +
      '<button type="button" class="edit-hero-btn" id="o-img-pick"' + (state.uploadingImg ? " disabled" : "") + ">" +
      (state.uploadingImg ? "Téléversement…" : "Modifier") +
      "</button>" +
      (state.editImgUrl && !state.uploadingImg
        ? '<button type="button" class="edit-hero-remove" id="o-img-remove">Retirer l\'image</button>'
        : "") +
      (state.uploadError ? '<div class="login-error">' + esc(state.uploadError) + "</div>" : "") +
      "</div>" +
      "</div>" +
      '<form id="o-form">' +
      '<label class="field-label" for="o-tag">Étiquette</label>' +
      '<input class="field" id="o-tag" required placeholder="Menu étudiant" value="' + esc(offer.tag) + '">' +
      '<label class="field-label" for="o-title">Titre</label>' +
      '<input class="field" id="o-title" required value="' + esc(offer.title) + '">' +
      '<label class="field-label" for="o-desc">Description</label>' +
      '<input class="field" id="o-desc" value="' + esc(offer.description) + '">' +
      '<hr class="divider">' +
      '<label class="field-label" for="o-price">Prix (optionnel)</label>' +
      '<input class="field" id="o-price" placeholder="11,90 €" value="' + esc(offer.price) + '">' +
      '<button type="submit" class="btn-primary" id="o-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (!isNew
        ? '<button type="button" class="btn-danger" id="o-delete"' + (state.saving ? " disabled" : "") + ">Supprimer cette offre</button>"
        : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      "</form>";

    document.getElementById("o-img-pick").addEventListener("click", () => {
      document.getElementById("o-img-file").click();
    });
    document.getElementById("o-img-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) uploadImage(file);
    });
    if (state.editImgUrl && !state.uploadingImg) {
      document.getElementById("o-img-remove").addEventListener("click", () => {
        state.editImgUrl = "";
        render();
      });
    }

    document.getElementById("o-back").addEventListener("click", () => {
      state.screen = "list";
      state.saveError = null;
      state.editImgUrl = undefined;
      render();
    });

    document.getElementById("o-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const newOffer = {
        tag: document.getElementById("o-tag").value.trim(),
        title: document.getElementById("o-title").value.trim(),
        description: document.getElementById("o-desc").value.trim(),
        price: document.getElementById("o-price").value.trim(),
      };
      if (state.editImgUrl) newOffer.img = state.editImgUrl;

      if (isNew) state.data.push(newOffer);
      else state.data[state.itemIndex] = newOffer;

      state.editImgUrl = undefined;
      await persist("list");
    });

    if (!isNew) {
      document.getElementById("o-delete").addEventListener("click", async () => {
        if (!confirm("Supprimer cette offre ?")) return;
        state.data.splice(state.itemIndex, 1);
        await persist("list");
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

  window.OffresEditor = {
    async open() {
      state = { screen: "loading", data: [], itemIndex: null, saving: false, saveError: null };
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
