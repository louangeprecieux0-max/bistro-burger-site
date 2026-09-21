"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("blog-view");

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

  const DEFAULT_BLOG = {
    categories: ["Brasserie", "Traiteur", "Annonce"],
    posts: [
      {
        id: "terrasse", slug: "la-terrasse-est-ouverte-tout-lete", img: "assets/blog-terrasse.png", date: "2026-08-02", category: "Brasserie", published: true,
        title: "La terrasse est ouverte tout l'été",
        excerpt: "Douze couverts supplémentaires à l'ombre, dès 19h et jusqu'à la fermeture.",
        body: "La terrasse est installée pour toute la saison, côté ombre, à l'écart du passage. Douze couverts de plus chaque soir, ouverts dès 19h et jusqu'à la fermeture. Sur les créneaux du vendredi et du samedi elle part vite : réservez si vous y tenez, en précisant votre préférence au moment de la demande.",
      },
      {
        id: "pain", slug: "un-nouveau-pain-livre-chaque-matin", img: "assets/blog-pain.png", date: "2026-07-24", category: "Brasserie", published: true,
        title: "Un nouveau pain, livré chaque matin",
        excerpt: "Nous travaillons désormais avec une boulangerie de Gardanne pour tous nos buns.",
        body: "Nos buns sont désormais façonnés par une boulangerie de Gardanne et livrés chaque matin. Le pain tient mieux à la cuisson, la mie reste moelleuse jusqu'à la dernière bouchée, et le circuit se raccourcit à quelques rues. Le changement concerne toute la carte, sur place comme à emporter.",
      },
      {
        id: "instagram", slug: "le-plat-du-jour-sur-instagram", img: "assets/blog-instagram.png", date: "2026-07-10", category: "Annonce", published: true,
        title: "Le plat du jour, maintenant sur Instagram",
        excerpt: "Retrouvez chaque matin l'ardoise du jour sur @bistroburger_gardanne.",
        body: "Chaque matin, l'ardoise du jour est publiée sur notre compte Instagram avant le service de midi. Plat, accompagnement et prix : de quoi décider avant de sortir du bureau.\n\nSuivez @bistroburger_gardanne pour la recevoir dans votre fil.",
      },
    ],
  };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function normalize(value) {
    if (!value || !Array.isArray(value.posts)) return clone(DEFAULT_BLOG);
    const posts = value.posts.map((p) => ({
      id: p.id || crypto.randomUUID(),
      slug: p.slug || "",
      title: p.title || "",
      excerpt: p.excerpt || "",
      body: p.body || "",
      category: p.category || "",
      date: p.date || "",
      img: p.img || "",
      published: p.published !== false,
    }));
    const categories = Array.isArray(value.categories) && value.categories.length ? value.categories.slice() : clone(DEFAULT_BLOG.categories);
    return { categories, posts };
  }

  async function apiGet() {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL + "?key=blog", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return normalize(json.value);
  }

  async function apiSave(data) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ key: "blog", value: data }),
    });
    if (!res.ok) throw new Error("Échec de l'enregistrement.");
    const json = await res.json();
    if (json.deployTriggered === false) {
      throw new Error("Enregistré, mais la republication du site a échoué. Contactez la personne qui gère le site.");
    }
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso + "T00:00:00"));
    } catch {
      return iso;
    }
  }

  function slugify(title) {
    const base = String(title || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "article";
    const taken = new Set(state.data.posts.map((p) => p.slug));
    let slug = base;
    let n = 2;
    while (taken.has(slug) || slug === "index" || slug === "article") slug = base + "-" + n++;
    return slug;
  }

  const IMAGE_BUCKET = "site-images";
  const EXT_BY_TYPE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  function imgSrc(img) {
    if (!img) return "";
    return /^https?:\/\//.test(img) ? img : "../" + img;
  }

  function saveStatusHtml() {
    if (state.saving) return '<div class="password-success">Enregistrement…</div>';
    if (state.saveError) return '<div class="login-error">' + esc(state.saveError) + "</div>";
    if (state.saveSuccess) return '<div class="password-success">Enregistré. La modification apparaîtra sur le site dans environ une minute.</div>';
    return "";
  }

  async function persist(nextScreen) {
    state.saving = true;
    state.saveError = null;
    state.saveSuccess = false;
    state.editIndex = null;
    state.screen = nextScreen;
    render();
    try {
      await apiSave(state.data);
      state.saveSuccess = true;
    } catch (err) {
      state.saveError = err.message;
    } finally {
      state.saving = false;
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
        '<button type="button" class="back-btn" id="bl-back-menu">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("bl-back-menu").addEventListener("click", () => window.adminShowDashboard());
      return;
    }
    if (state.screen === "edit") renderEdit();
    else renderList();
  }

  /* ---------------------------- Liste ---------------------------- */

  function renderList() {
    const cats = state.data.categories;
    const chips = cats.length
      ? cats.map((c, i) =>
          '<span class="r-chip">' + esc(c) +
          '<button type="button" class="r-chip-remove" data-remove-cat="' + i + '" aria-label="Retirer la catégorie">×</button></span>'
        ).join("")
      : '<p class="dashboard-note">Aucune catégorie.</p>';

    const sorted = state.data.posts
      .map((p, i) => ({ p, i }))
      .sort((a, b) => String(b.p.date).localeCompare(String(a.p.date)));

    const rows = sorted.map(({ p, i }) =>
      '<div class="list-row-wrap">' +
      '<button type="button" class="list-row" data-post="' + i + '">' +
      '<span class="list-row-main">' +
      '<span class="list-row-title">' + esc(p.title || "(Sans titre)") + "</span>" +
      '<span class="list-row-sub">' + esc([p.category || "Sans catégorie", p.date ? formatDate(p.date) : "", p.published ? "Publié" : "Brouillon"].filter(Boolean).join(" · ")) + "</span>" +
      "</span>" +
      '<span class="list-row-arrow">›</span>' +
      "</button></div>"
    ).join("");

    container.innerHTML =
      '<button type="button" class="back-btn" id="bl-back-menu">‹ Retour au menu</button>' +
      "<h1>Blog</h1>" +
      '<p class="dashboard-note">Les articles affichés sur la page Blog du site. Choisissez une catégorie pour chaque article : les visiteurs peuvent filtrer par catégorie.</p>' +
      '<label class="r-label">Catégories</label>' +
      '<div class="r-chip-row">' + chips + "</div>" +
      '<div class="r-chip-add">' +
      '<input class="r-chip-input" id="bl-cat-input" placeholder="Nouvelle catégorie (ex : Événements)">' +
      '<button type="button" class="r-chip-add-btn" id="bl-cat-add">Ajouter</button>' +
      "</div>" +
      '<hr class="divider">' +
      '<label class="r-label">Articles</label>' +
      '<div class="list">' + (rows || '<p class="dashboard-note">Aucun article pour l\'instant.</p>') + "</div>" +
      '<div style="display:flex; gap:10px; align-items:center;">' +
      '<button type="button" class="btn-secondary" id="bl-add-post">+ Nouvel article</button>' +
      (state.deletedPosts.length > 0
        ? '<button type="button" class="icon-btn icon-btn-restore" id="bl-restore" title="Restaurer les articles supprimés" aria-label="Restaurer les articles supprimés">↺</button>'
        : "") +
      "</div>" +
      saveStatusHtml();

    document.getElementById("bl-back-menu").addEventListener("click", () => window.adminShowDashboard());

    container.querySelectorAll("[data-post]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.editIndex = Number(btn.dataset.post);
        state.editImgUrl = undefined;
        state.restoredFields = null;
        state.draftChecked = false;
        state.pendingDraft = null;
        state.saveSuccess = false;
        state.saveError = null;
        state.screen = "edit";
        render();
      });
    });
    document.getElementById("bl-add-post").addEventListener("click", () => {
      state.editIndex = null;
      state.editImgUrl = undefined;
      state.restoredFields = null;
      state.draftChecked = false;
      state.pendingDraft = null;
      state.saveSuccess = false;
      state.saveError = null;
      state.screen = "edit";
      render();
    });

    function addCategory() {
      const input = document.getElementById("bl-cat-input");
      const val = input.value.trim();
      if (!val) return;
      if (state.data.categories.some((c) => c.toLowerCase() === val.toLowerCase())) {
        state.saveError = "Cette catégorie existe déjà.";
        state.saveSuccess = false;
        render();
        return;
      }
      state.data.categories.push(val);
      persist("list");
    }
    document.getElementById("bl-cat-add").addEventListener("click", addCategory);
    document.getElementById("bl-cat-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); addCategory(); }
    });
    container.querySelectorAll("[data-remove-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.removeCat);
        const name = state.data.categories[i];
        const used = state.data.posts.filter((p) => p.category === name).length;
        if (used > 0) {
          state.saveError = "La catégorie « " + name + " » est utilisée par " + used + " article(s). Changez leur catégorie avant de la retirer.";
          state.saveSuccess = false;
          render();
          return;
        }
        state.data.categories.splice(i, 1);
        persist("list");
      });
    });
    if (state.deletedPosts.length > 0) {
      document.getElementById("bl-restore").addEventListener("click", () => {
        state.deletedPosts.forEach((p) => state.data.posts.push(p));
        state.deletedPosts = [];
        persist("list");
      });
    }
  }

  /* --------------------------- Édition --------------------------- */

  function draftKey() {
    return "blog:" + (state.editIndex === null ? "new" : state.data.posts[state.editIndex].id);
  }

  function readEditFields() {
    return {
      title: document.getElementById("bl-title").value,
      category: document.getElementById("bl-cat").value,
      date: document.getElementById("bl-date").value,
      excerpt: document.getElementById("bl-excerpt").value,
      body: document.getElementById("bl-body").value,
      published: document.getElementById("bl-published").checked,
      img: state.editImgUrl || "",
    };
  }

  function scheduleDraftSave() {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(() => {
      window.AdminDrafts.save(draftKey(), readEditFields());
      const statusEl = document.getElementById("bl-draft-status");
      if (statusEl) statusEl.textContent = "Brouillon enregistré automatiquement — à l'instant";
    }, 800);
  }

  async function uploadImage(file) {
    state.restoredFields = readEditFields();
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
      state.restoredFields = Object.assign({}, state.restoredFields, { img: state.editImgUrl || "" });
      render();
      scheduleDraftSave();
    }
  }

  function renderEdit() {
    const isNew = state.editIndex === null;
    const existing = isNew ? null : state.data.posts[state.editIndex];
    const post = state.restoredFields ||
      (isNew ? { title: "", category: state.data.categories[0] || "", date: todayISO(), excerpt: "", body: "", published: true, img: "" } : existing);
    if (state.editImgUrl === undefined) state.editImgUrl = post.img || "";

    if (!state.draftChecked) {
      state.draftChecked = true;
      state.pendingDraft = window.AdminDrafts.load(draftKey());
    }

    const imgPreview = state.editImgUrl
      ? '<img class="edit-hero-img" src="' + esc(imgSrc(state.editImgUrl)) + '" alt="">'
      : '<div class="edit-hero-empty">Aucune image</div>';

    const catOptions = state.data.categories
      .map((c) => '<option value="' + esc(c) + '"' + (c === post.category ? " selected" : "") + ">" + esc(c) + "</option>")
      .join("") +
      (post.category && !state.data.categories.includes(post.category)
        ? '<option value="' + esc(post.category) + '" selected>' + esc(post.category) + "</option>"
        : "");

    container.innerHTML =
      '<button type="button" class="back-btn" id="bl-back-list">‹ Tous les articles</button>' +
      "<h1>" + (isNew ? "Nouvel article" : "Modifier l'article") + "</h1>" +
      (state.pendingDraft
        ? '<div class="draft-banner">Un brouillon non enregistré existe pour cet article (' + window.AdminDrafts.timeAgo(state.pendingDraft.savedAt) + ").<div class=\"draft-banner-actions\">" +
          '<button type="button" class="draft-banner-btn" id="bl-draft-restore">Restaurer le brouillon</button>' +
          '<button type="button" class="draft-banner-btn draft-banner-btn-ghost" id="bl-draft-ignore">Ignorer</button></div></div>'
        : "") +
      '<div class="edit-hero">' +
      imgPreview +
      '<div class="edit-hero-body">' +
      '<input type="file" id="bl-img-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden' + (state.uploadingImg ? " disabled" : "") + ">" +
      '<button type="button" class="edit-hero-btn" id="bl-img-pick"' + (state.uploadingImg ? " disabled" : "") + ">" +
      (state.uploadingImg ? "Téléversement…" : (state.editImgUrl ? "Modifier" : "Ajouter une image")) + "</button>" +
      (state.editImgUrl && !state.uploadingImg ? '<button type="button" class="edit-hero-remove" id="bl-img-remove">Retirer l\'image</button>' : "") +
      (state.uploadError ? '<div class="login-error">' + esc(state.uploadError) + "</div>" : "") +
      '<p class="edit-hero-hint">Image de l\'article<br>Format recommandé : <strong>JPG ou WebP</strong><br>Dimensions recommandées : <strong>1600 × 1000&nbsp;px</strong> (paysage)<br>Poids maximal : 8 Mo</p>' +
      "</div></div>" +
      '<form id="bl-form">' +
      '<label class="field-label" for="bl-title">Titre</label>' +
      '<input class="field" id="bl-title" required value="' + esc(post.title) + '">' +
      '<label class="field-label" for="bl-cat">Catégorie</label>' +
      '<select class="field" id="bl-cat">' + catOptions + "</select>" +
      '<label class="field-label" for="bl-date">Date</label>' +
      '<input class="field" type="date" id="bl-date" required value="' + esc(post.date) + '">' +
      '<label class="field-label" for="bl-excerpt">Résumé (affiché dans la liste)</label>' +
      '<textarea class="field" id="bl-excerpt" rows="2" maxlength="220" placeholder="Une ou deux phrases pour donner envie de lire">' + esc(post.excerpt) + "</textarea>" +
      '<label class="field-label" for="bl-body">Texte de l\'article</label>' +
      '<textarea class="field" id="bl-body" rows="14" placeholder="Écrivez votre article ici…">' + esc(post.body) + "</textarea>" +
      '<p class="dashboard-note" style="margin-top:8px;">Sautez une ligne pour changer de paragraphe. <strong>## Mon titre</strong> crée un intertitre, <strong>**texte**</strong> met en gras. Les adresses web (https://…) deviennent des liens.</p>' +
      '<label class="admin-checkbox" style="margin-top:14px;"><input type="checkbox" id="bl-published"' + (post.published ? " checked" : "") + "> Publié (décochez pour garder en brouillon, invisible sur le site)</label>" +
      '<button type="submit" class="btn-primary" id="bl-save"' + (state.saving ? " disabled" : "") + ">" + (state.saving ? "Enregistrement…" : "Enregistrer") + "</button>" +
      (!isNew ? '<button type="button" class="btn-danger" id="bl-delete"' + (state.saving ? " disabled" : "") + ">Supprimer cet article</button>" : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      '<div id="bl-draft-status" class="dashboard-note" style="margin-top:10px;"></div>' +
      "</form>";

    document.getElementById("bl-img-pick").addEventListener("click", () => document.getElementById("bl-img-file").click());
    document.getElementById("bl-img-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) uploadImage(file);
    });
    const removeBtn = document.getElementById("bl-img-remove");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        state.restoredFields = readEditFields();
        state.editImgUrl = "";
        state.restoredFields.img = "";
        render();
        scheduleDraftSave();
      });
    }

    if (state.pendingDraft) {
      document.getElementById("bl-draft-restore").addEventListener("click", () => {
        const d = state.pendingDraft.data;
        state.restoredFields = {
          title: d.title || "", category: d.category || post.category, date: d.date || post.date,
          excerpt: d.excerpt || "", body: d.body || "", published: d.published !== false, img: d.img || "",
        };
        state.editImgUrl = d.img || "";
        state.pendingDraft = null;
        render();
      });
      document.getElementById("bl-draft-ignore").addEventListener("click", () => {
        window.AdminDrafts.clear(draftKey());
        state.pendingDraft = null;
        render();
      });
    }

    document.getElementById("bl-form").addEventListener("input", scheduleDraftSave);
    document.getElementById("bl-form").addEventListener("change", scheduleDraftSave);

    stopDraftTicker();
    draftTickTimer = setInterval(() => {
      const draft = window.AdminDrafts.load(draftKey());
      const statusEl = document.getElementById("bl-draft-status");
      if (draft && statusEl) statusEl.textContent = "Brouillon enregistré automatiquement — " + window.AdminDrafts.timeAgo(draft.savedAt);
    }, 5000);

    document.getElementById("bl-back-list").addEventListener("click", () => {
      stopDraftTicker();
      state.screen = "list";
      state.saveError = null;
      state.editImgUrl = undefined;
      state.restoredFields = null;
      render();
    });

    document.getElementById("bl-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = readEditFields();
      const next = {
        id: existing ? existing.id : crypto.randomUUID(),
        slug: existing ? existing.slug : slugify(f.title),
        title: f.title.trim(),
        category: f.category,
        date: f.date,
        excerpt: f.excerpt.trim(),
        body: f.body.replace(/\r/g, "").trim(),
        img: state.editImgUrl || "",
        published: f.published,
      };
      const key = draftKey();
      if (isNew) state.data.posts.push(next);
      else state.data.posts[state.editIndex] = next;

      window.AdminDrafts.clear(key);
      stopDraftTicker();
      state.editImgUrl = undefined;
      state.restoredFields = null;
      await persist("list");
    });

    if (!isNew) {
      document.getElementById("bl-delete").addEventListener("click", async () => {
        if (!confirm("Supprimer cet article ? Vous pourrez le restaurer tant que vous restez sur cette page.")) return;
        const key = draftKey();
        state.deletedPosts.push(existing);
        state.data.posts.splice(state.editIndex, 1);
        window.AdminDrafts.clear(key);
        stopDraftTicker();
        state.editImgUrl = undefined;
        state.restoredFields = null;
        await persist("list");
      });
    }
  }

  window.BlogEditor = {
    async open() {
      state = { screen: "loading", data: null, editIndex: null, saving: false, saveError: null, saveSuccess: false, deletedPosts: [] };
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
