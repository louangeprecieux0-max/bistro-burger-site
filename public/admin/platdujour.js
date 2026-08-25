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

  async function apiGet() {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL + "?key=plat_du_jour", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return (
      json.value || {
        plat: { label: "Plat du jour", meta: "", title: "", price: "" },
        suggestion: { label: "Suggestion du jour", title: "", description: "", price: "" },
      }
    );
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

  function render() {
    if (state.screen === "loading") {
      container.innerHTML = '<div class="editor-loading">Chargement…</div>';
      return;
    }
    if (state.screen === "error") {
      container.innerHTML = '<div class="login-error">' + esc(state.error) + "</div>";
      return;
    }

    const plat = state.data.plat;
    const sug = state.data.suggestion;

    container.innerHTML =
      "<h1>Plat du jour</h1>" +
      '<p class="dashboard-note">Affiché en haut de la page, mis à jour au fur et à mesure.</p>' +
      '<form id="pdj-form">' +
      "<h2>Plat du jour</h2>" +
      '<label class="field-label" for="pdj-meta">Jour et horaire</label>' +
      '<input class="field" id="pdj-meta" placeholder="Jeudi 7 août · servi de 12h à 14h" value="' + esc(plat.meta) + '">' +
      '<label class="field-label" for="pdj-title">Nom du plat</label>' +
      '<input class="field" id="pdj-title" required value="' + esc(plat.title) + '">' +
      '<label class="field-label" for="pdj-price">Prix</label>' +
      '<input class="field" id="pdj-price" placeholder="14,50 €" value="' + esc(plat.price) + '">' +
      '<hr class="divider">' +
      "<h2>Suggestion du jour</h2>" +
      '<label class="field-label" for="sug-title">Nom du plat</label>' +
      '<input class="field" id="sug-title" required value="' + esc(sug.title) + '">' +
      '<label class="field-label" for="sug-desc">Description</label>' +
      '<input class="field" id="sug-desc" value="' + esc(sug.description) + '">' +
      '<label class="field-label" for="sug-price">Prix</label>' +
      '<input class="field" id="sug-price" placeholder="16,90 €" value="' + esc(sug.price) + '">' +
      '<button type="submit" class="btn-primary" id="pdj-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (state.saveSuccess ? '<div class="password-success">Enregistré.</div>' : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      "</form>";

    document.getElementById("pdj-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      state.data.plat = {
        label: plat.label || "Plat du jour",
        meta: document.getElementById("pdj-meta").value.trim(),
        title: document.getElementById("pdj-title").value.trim(),
        price: document.getElementById("pdj-price").value.trim(),
      };
      state.data.suggestion = {
        label: sug.label || "Suggestion du jour",
        title: document.getElementById("sug-title").value.trim(),
        description: document.getElementById("sug-desc").value.trim(),
        price: document.getElementById("sug-price").value.trim(),
      };

      state.saving = true;
      state.saveError = null;
      state.saveSuccess = false;
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
    });
  }

  window.PlatDuJourEditor = {
    async open() {
      state = { screen: "loading", data: null, saving: false, saveError: null, saveSuccess: false };
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
