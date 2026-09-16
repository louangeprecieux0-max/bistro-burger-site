"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("platdujour-view");

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

  function normalize(value) {
    const plat = (value && value.plat) || { label: "Plat du jour", meta: "", title: "", price: "" };
    let suggestions = value && Array.isArray(value.suggestions) ? value.suggestions : null;
    if (!suggestions) {
      suggestions = value && value.suggestion ? [value.suggestion] : [{ label: "Suggestion du jour", title: "", description: "", price: "" }];
    }
    if (!suggestions.length) {
      suggestions = [{ label: "Suggestion du jour", title: "", description: "", price: "" }];
    }
    return { plat, suggestions };
  }

  async function apiGet() {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL + "?key=plat_du_jour", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return normalize(json.value);
  }

  async function apiSave(data) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ key: "plat_du_jour", value: data }),
    });
    if (!res.ok) throw new Error("Échec de l'enregistrement.");
    const json = await res.json();
    if (json.deployTriggered === false) {
      throw new Error(
        "Enregistré, mais la republication du site a échoué. Contactez la personne qui gère le site."
      );
    }
  }

  function readPlatFromDom() {
    return {
      label: state.data.plat.label || "Plat du jour",
      meta: document.getElementById("pdj-meta").value.trim(),
      title: document.getElementById("pdj-title").value.trim(),
      price: document.getElementById("pdj-price").value.trim(),
    };
  }

  function readSuggestionsFromDom() {
    return state.data.suggestions.map((sug, i) => ({
      label: sug.label || "Suggestion du jour",
      title: (document.getElementById("sug-title-" + i) || {}).value?.trim() || "",
      description: (document.getElementById("sug-desc-" + i) || {}).value?.trim() || "",
      price: (document.getElementById("sug-price-" + i) || {}).value?.trim() || "",
    }));
  }

  function suggestionCardHtml(sug, i, canRemove) {
    return (
      '<div class="editor-block" style="border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:12px;">' +
      '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">' +
      '<span style="font-family:var(--font-heading); font-weight:700; font-size:13px; color:var(--muted);">Suggestion ' + (i + 1) + "</span>" +
      (canRemove
        ? '<button type="button" class="icon-btn icon-btn-danger" data-remove-sug="' + i + '" aria-label="Retirer cette suggestion" title="Retirer cette suggestion">✕</button>'
        : "") +
      "</div>" +
      '<label class="field-label" for="sug-title-' + i + '">Nom du plat</label>' +
      '<input class="field" id="sug-title-' + i + '" value="' + esc(sug.title) + '">' +
      '<label class="field-label" for="sug-desc-' + i + '">Description</label>' +
      '<input class="field" id="sug-desc-' + i + '" value="' + esc(sug.description) + '">' +
      '<label class="field-label" for="sug-price-' + i + '">Prix</label>' +
      '<input class="field" id="sug-price-' + i + '" placeholder="16,90 €" value="' + esc(sug.price) + '">' +
      "</div>"
    );
  }

  function render() {
    if (state.screen === "loading") {
      container.innerHTML = '<div class="editor-loading">Chargement…</div>';
      return;
    }
    if (state.screen === "error") {
      container.innerHTML =
        '<button type="button" class="back-btn" id="pdj-back-menu-error">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("pdj-back-menu-error").addEventListener("click", () => window.adminShowDashboard());
      return;
    }

    const plat = state.data.plat;
    const suggestions = state.data.suggestions;

    container.innerHTML =
      '<button type="button" class="back-btn" id="pdj-back-menu">‹ Retour</button>' +
      "<h1>Plat du jour</h1>" +
      '<p class="dashboard-note">Affiché en haut de la page, mis à jour au fur et à mesure. Le plat du jour et les suggestions s\'enregistrent séparément.</p>' +
      '<form id="pdj-form">' +
      "<h2>Plat du jour</h2>" +
      '<label class="field-label" for="pdj-meta">Jour et horaire</label>' +
      '<input class="field" id="pdj-meta" placeholder="Jeudi 7 août · servi de 12h à 14h" value="' + esc(plat.meta) + '">' +
      '<label class="field-label" for="pdj-title">Nom du plat</label>' +
      '<input class="field" id="pdj-title" required value="' + esc(plat.title) + '">' +
      '<label class="field-label" for="pdj-price">Prix</label>' +
      '<input class="field" id="pdj-price" placeholder="14,50 €" value="' + esc(plat.price) + '">' +
      '<button type="submit" class="btn-primary" id="pdj-save"' + (state.savingPlat ? " disabled" : "") + ">" +
      (state.savingPlat ? "Enregistrement…" : "Enregistrer le plat du jour") +
      "</button>" +
      (state.platSaveSuccess ? '<div class="password-success">Enregistré.</div>' : "") +
      (state.platSaveError ? '<div class="login-error">' + esc(state.platSaveError) + "</div>" : "") +
      "</form>" +
      '<hr class="divider">' +
      '<form id="sug-form">' +
      "<h2>Suggestions</h2>" +
      suggestions.map((sug, i) => suggestionCardHtml(sug, i, suggestions.length > 1)).join("") +
      '<button type="button" class="btn-secondary" id="sug-add" style="margin-bottom:16px;">+ Ajouter une suggestion</button>' +
      '<button type="submit" class="btn-primary" id="sug-save"' + (state.savingSug ? " disabled" : "") + ">" +
      (state.savingSug ? "Enregistrement…" : "Enregistrer les suggestions") +
      "</button>" +
      (state.sugSaveSuccess ? '<div class="password-success">Enregistré.</div>' : "") +
      (state.sugSaveError ? '<div class="login-error">' + esc(state.sugSaveError) + "</div>" : "") +
      "</form>";

    document.getElementById("pdj-back-menu").addEventListener("click", () => window.adminShowDashboard());

    document.getElementById("pdj-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      state.data.plat = readPlatFromDom();
      state.data.suggestions = readSuggestionsFromDom();

      state.savingPlat = true;
      state.platSaveError = null;
      state.platSaveSuccess = false;
      render();
      try {
        await apiSave(state.data);
        state.platSaveSuccess = true;
      } catch (err) {
        state.platSaveError = err.message;
      } finally {
        state.savingPlat = false;
        render();
      }
    });

    document.getElementById("sug-add").addEventListener("click", () => {
      state.data.plat = readPlatFromDom();
      state.data.suggestions = readSuggestionsFromDom();
      state.data.suggestions.push({ label: "Suggestion du jour", title: "", description: "", price: "" });
      render();
    });

    container.querySelectorAll("[data-remove-sug]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.removeSug);
        state.data.plat = readPlatFromDom();
        state.data.suggestions = readSuggestionsFromDom();
        state.data.suggestions.splice(i, 1);
        render();
      });
    });

    document.getElementById("sug-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      state.data.plat = readPlatFromDom();
      state.data.suggestions = readSuggestionsFromDom();

      state.savingSug = true;
      state.sugSaveError = null;
      state.sugSaveSuccess = false;
      render();
      try {
        await apiSave(state.data);
        state.sugSaveSuccess = true;
      } catch (err) {
        state.sugSaveError = err.message;
      } finally {
        state.savingSug = false;
        render();
      }
    });
  }

  window.PlatDuJourEditor = {
    async open() {
      state = {
        screen: "loading",
        data: null,
        savingPlat: false,
        platSaveError: null,
        platSaveSuccess: false,
        savingSug: false,
        sugSaveError: null,
        sugSaveSuccess: false,
      };
      render();
      try {
        state.data = await apiGet();
        state.screen = "ready";
      } catch (err) {
        state.screen = "error";
        state.error = err.message;
      }
      render();
    },
  };
})();
