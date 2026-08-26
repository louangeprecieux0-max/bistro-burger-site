"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("popup-view");

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
    const res = await fetch(API_URL + "?key=promo_popup", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return (
      json.value || {
        badge: "Offre du moment",
        title: "Le menu enfant offert",
        description: "Le mardi soir et le mercredi midi, le menu enfant est offert pour tout menu adulte acheté. Réservez votre table pour en profiter.",
        button_label: "Réserver",
      }
    );
  }

  async function apiSave(data) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ key: "promo_popup", value: data }),
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
        '<button type="button" class="back-btn" id="pop-back-menu-error">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("pop-back-menu-error").addEventListener("click", () => window.adminShowDashboard());
      return;
    }

    const d = state.data;

    container.innerHTML =
      '<button type="button" class="back-btn" id="pop-back-menu">‹ Retour</button>' +
      "<h1>Pop-up promo</h1>" +
      '<p class="dashboard-note">La fenêtre qui s\'affiche automatiquement sur le site quelques secondes après l\'arrivée d\'un visiteur.</p>' +
      '<form id="pop-form">' +
      '<label class="field-label" for="pop-badge">Étiquette</label>' +
      '<input class="field" id="pop-badge" required placeholder="Offre du moment" value="' + esc(d.badge) + '">' +
      '<label class="field-label" for="pop-title">Titre</label>' +
      '<input class="field" id="pop-title" required placeholder="Le menu enfant offert" value="' + esc(d.title) + '">' +
      '<label class="field-label" for="pop-desc">Description</label>' +
      '<textarea class="field" id="pop-desc" rows="4" required>' + esc(d.description) + "</textarea>" +
      '<label class="field-label" for="pop-btn">Texte du bouton</label>' +
      '<input class="field" id="pop-btn" required placeholder="Réserver" value="' + esc(d.button_label) + '">' +
      '<button type="submit" class="btn-primary" id="pop-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (state.saveSuccess ? '<div class="password-success">Enregistré.</div>' : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      "</form>";

    document.getElementById("pop-back-menu").addEventListener("click", () => window.adminShowDashboard());

    document.getElementById("pop-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      state.data = {
        badge: document.getElementById("pop-badge").value.trim(),
        title: document.getElementById("pop-title").value.trim(),
        description: document.getElementById("pop-desc").value.trim(),
        button_label: document.getElementById("pop-btn").value.trim(),
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

  window.PopupEditor = {
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
