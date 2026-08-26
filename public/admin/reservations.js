"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("reservations-view");

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
    const res = await fetch(API_URL + "?key=reservation_settings", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return json.value || { heures: [], couverts: [], horaires_text: [] };
  }

  async function apiSave(data) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ key: "reservation_settings", value: data }),
    });
    if (!res.ok) throw new Error("Échec de l'enregistrement.");
    const json = await res.json();
    if (json.deployTriggered === false) {
      throw new Error(
        "Enregistré, mais la republication du site a échoué. Contactez la personne qui gère le site."
      );
    }
  }

  function linesToArray(text) {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function render() {
    if (state.screen === "loading") {
      container.innerHTML = '<div class="editor-loading">Chargement…</div>';
      return;
    }
    if (state.screen === "error") {
      container.innerHTML =
        '<button type="button" class="back-btn" id="r-back-menu-error">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("r-back-menu-error").addEventListener("click", () => window.adminShowDashboard());
      return;
    }

    const d = state.data;

    container.innerHTML =
      '<button type="button" class="back-btn" id="r-back-menu">‹ Retour</button>' +
      "<h1>Réglages de réservation</h1>" +
      '<p class="dashboard-note">Une valeur par ligne. L\'ordre des lignes est celui affiché sur le site.</p>' +
      '<form id="r-form">' +
      "<h2>Créneaux horaires proposés</h2>" +
      '<textarea class="field r-textarea" id="r-heures" rows="6">' + esc((d.heures || []).join("\n")) + "</textarea>" +
      '<hr class="divider">' +
      "<h2>Nombre de couverts proposé</h2>" +
      '<textarea class="field r-textarea" id="r-couverts" rows="5">' + esc((d.couverts || []).join("\n")) + "</textarea>" +
      '<hr class="divider">' +
      "<h2>Horaires affichés sur le site</h2>" +
      '<textarea class="field r-textarea" id="r-horaires" rows="4">' + esc((d.horaires_text || []).join("\n")) + "</textarea>" +
      '<button type="submit" class="btn-primary" id="r-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      (state.saveSuccess ? '<div class="password-success">Enregistré.</div>' : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "") +
      "</form>";

    document.getElementById("r-back-menu").addEventListener("click", () => window.adminShowDashboard());
    document.getElementById("r-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      state.data = {
        heures: linesToArray(document.getElementById("r-heures").value),
        couverts: linesToArray(document.getElementById("r-couverts").value),
        horaires_text: linesToArray(document.getElementById("r-horaires").value),
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

  window.ReservationsEditor = {
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
