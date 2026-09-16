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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toISODate(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function formatDisplayDate(iso) {
    try {
      const s = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso + "T00:00:00"));
      return s.charAt(0).toUpperCase() + s.slice(1);
    } catch {
      return iso;
    }
  }

  function normalize(value) {
    const rawPlat = (value && value.plat) || {};
    const plat = {
      label: rawPlat.label || "Plat du jour",
      date: rawPlat.date || "",
      horaire: rawPlat.horaire != null ? rawPlat.horaire : rawPlat.meta || "",
      title: rawPlat.title || "",
      price: rawPlat.price || "",
    };
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
    const custom = document.getElementById("pdj-horaire-custom").value.trim();
    return {
      label: state.data.plat.label || "Plat du jour",
      date: state.data.plat.date || "",
      horaire: custom || state.data.plat.horaire || "",
      title: document.getElementById("pdj-title").value.trim(),
      price: document.getElementById("pdj-price").value.trim(),
    };
  }

  function calendarHtml() {
    const y = state.calYear;
    const m = state.calMonth;
    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const todayStr = toISODate(new Date());
    const selected = state.data.plat.date || "";
    const monthLabel = first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    let cells = "";
    for (let i = 0; i < startOffset; i++) cells += "<span></span>";
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = y + "-" + pad2(m + 1) + "-" + pad2(d);
      const cls = ["pdj-cal-day"];
      if (dateStr === selected) cls.push("is-selected");
      if (dateStr === todayStr) cls.push("is-today");
      cells += '<button type="button" class="' + cls.join(" ") + '" data-cal-day="' + dateStr + '">' + d + "</button>";
    }

    return (
      '<div class="pdj-cal">' +
      (selected
        ? '<div class="pdj-cal-selected-box"><span class="pdj-cal-selected-check">✓</span>' + esc(formatDisplayDate(selected)) + "</div>"
        : '<div class="pdj-cal-selected-box is-empty">Choisissez une date ci-dessous</div>') +
      '<div class="pdj-cal-head">' +
      '<button type="button" class="pdj-cal-nav" id="pdj-cal-prev" aria-label="Mois précédent">‹</button>' +
      '<span class="pdj-cal-month">' + esc(monthLabelCap) + "</span>" +
      '<button type="button" class="pdj-cal-nav" id="pdj-cal-next" aria-label="Mois suivant">›</button>' +
      "</div>" +
      '<div class="pdj-cal-grid">' +
      ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => '<span class="pdj-cal-dow">' + d + "</span>").join("") +
      cells +
      "</div>" +
      "</div>"
    );
  }

  const HORAIRE_PRESETS = [
    "Servi de 12h à 14h",
    "Servi de 12h à 14h30",
    "Servi de 19h à 21h",
    "Servi de 19h à 21h30",
    "Servi toute la journée",
  ];

  function horaireSlotsHtml() {
    const current = state.data.plat.horaire || "";
    return (
      '<div class="pdj-slot-list">' +
      HORAIRE_PRESETS.map((h) => {
        const isSelected = h === current;
        return (
          '<button type="button" class="pdj-slot-btn' + (isSelected ? " is-selected" : "") + '" data-horaire="' + esc(h) + '">' +
          (isSelected ? '<span class="pdj-slot-check">✓</span>' : "") +
          esc(h) +
          "</button>"
        );
      }).join("") +
      "</div>"
    );
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
      '<label class="field-label">Date</label>' +
      calendarHtml() +
      '<label class="field-label">Horaire</label>' +
      horaireSlotsHtml() +
      '<label class="field-label" for="pdj-horaire-custom">Autre horaire (optionnel)</label>' +
      '<input class="field" id="pdj-horaire-custom" placeholder="Ex : Service continu" value="' + (HORAIRE_PRESETS.includes(plat.horaire) ? "" : esc(plat.horaire)) + '">' +
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

    document.getElementById("pdj-cal-prev").addEventListener("click", () => {
      state.data.plat = readPlatFromDom();
      state.calMonth -= 1;
      if (state.calMonth < 0) { state.calMonth = 11; state.calYear -= 1; }
      render();
    });
    document.getElementById("pdj-cal-next").addEventListener("click", () => {
      state.data.plat = readPlatFromDom();
      state.calMonth += 1;
      if (state.calMonth > 11) { state.calMonth = 0; state.calYear += 1; }
      render();
    });
    container.querySelectorAll("[data-cal-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const plat = readPlatFromDom();
        plat.date = btn.dataset.calDay;
        state.data.plat = plat;
        render();
      });
    });

    container.querySelectorAll("[data-horaire]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const plat = readPlatFromDom();
        plat.horaire = btn.dataset.horaire;
        state.data.plat = plat;
        render();
      });
    });

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
        const initial = state.data.plat.date ? new Date(state.data.plat.date + "T00:00:00") : new Date();
        state.calYear = initial.getFullYear();
        state.calMonth = initial.getMonth();
        state.screen = "ready";
      } catch (err) {
        state.screen = "error";
        state.error = err.message;
      }
      render();
    },
  };
})();
