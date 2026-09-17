"use strict";
(() => {
  const API_URL = "/api/admin/content";
  const container = document.getElementById("annonces-view");

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
    const res = await fetch(API_URL + "?key=annonces", { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return Array.isArray(json.value) ? json.value : [];
  }

  async function apiSave(data) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ key: "annonces", value: data }),
    });
    if (!res.ok) throw new Error("Échec de l'enregistrement.");
    const json = await res.json();
    if (json.deployTriggered === false) {
      throw new Error(
        "Enregistré, mais la republication du site a échoué. Contactez la personne qui gère le site."
      );
    }
  }

  function chipRowHtml(values) {
    if (!values.length) return '<p class="dashboard-note">Aucune annonce pour l\'instant.</p>';
    return values
      .map(
        (v, i) =>
          '<span class="r-chip">' +
          esc(v) +
          '<button type="button" class="r-chip-remove" data-remove-i="' + i + '" aria-label="Retirer">×</button>' +
          "</span>"
      )
      .join("");
  }

  function render() {
    if (state.screen === "loading") {
      container.innerHTML = '<div class="editor-loading">Chargement…</div>';
      return;
    }
    if (state.screen === "error") {
      container.innerHTML =
        '<button type="button" class="back-btn" id="an-back-menu-error">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("an-back-menu-error").addEventListener("click", () => window.adminShowDashboard());
      return;
    }

    container.innerHTML =
      '<button type="button" class="back-btn" id="an-back-menu">‹ Retour</button>' +
      "<h1>Annonces</h1>" +
      '<p class="dashboard-note">Le bandeau qui défile en haut du site. Ajoutez ou retirez des annonces, l\'ordre est celui affiché.</p>' +
      '<label class="r-label">Annonces</label>' +
      '<div class="r-chip-row">' + chipRowHtml(state.data) + "</div>" +
      '<div class="r-chip-add">' +
      '<input class="r-chip-input" id="an-input" placeholder="Ajouter une annonce (ex : Diffusion des matchs de l\'OM)">' +
      '<button type="button" class="r-chip-add-btn" id="an-add-btn">Ajouter</button>' +
      "</div>" +
      '<div class="r-actions">' +
      '<button type="button" class="r-btn-back" id="an-cancel"' + (state.saving ? " disabled" : "") + ">Annuler</button>" +
      '<button type="button" class="r-btn-save" id="an-save"' + (state.saving ? " disabled" : "") + ">" +
      (state.saving ? "Enregistrement…" : "Enregistrer") +
      "</button>" +
      "</div>" +
      (state.saveSuccess ? '<div class="password-success">Enregistré.</div>' : "") +
      (state.saveError ? '<div class="login-error">' + esc(state.saveError) + "</div>" : "");

    document.getElementById("an-back-menu").addEventListener("click", () => window.adminShowDashboard());

    container.querySelectorAll("[data-remove-i]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.removeI);
        state.data.splice(i, 1);
        render();
      });
    });

    function addFromInput() {
      const input = document.getElementById("an-input");
      const val = input.value.trim();
      if (!val) return;
      state.data.push(val);
      render();
    }

    document.getElementById("an-add-btn").addEventListener("click", addFromInput);
    document.getElementById("an-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addFromInput();
      }
    });

    document.getElementById("an-cancel").addEventListener("click", async () => {
      state.screen = "loading";
      state.saveError = null;
      state.saveSuccess = false;
      render();
      try {
        state.data = await apiGet();
        state.screen = "ready";
      } catch (err) {
        state.screen = "error";
        state.error = err.message;
      }
      render();
    });

    document.getElementById("an-save").addEventListener("click", async () => {
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

  window.AnnoncesEditor = {
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
