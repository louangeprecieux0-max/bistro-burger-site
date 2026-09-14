"use strict";
(() => {
  const API_URL = "/api/admin/orders";
  const container = document.getElementById("commandes-view");

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

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function formatPrice(n) {
    const num = Number(n) || 0;
    return (Number.isInteger(num) ? num : num.toFixed(2).replace(".", ",")) + " €";
  }

  async function apiList() {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, { headers });
    if (!res.ok) throw new Error("Échec du chargement.");
    const json = await res.json();
    return json.items || [];
  }

  async function apiSetStatus(id, status) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) throw new Error("Échec de la mise à jour.");
  }

  async function apiDelete(id) {
    const headers = await window.adminAuth.authHeader();
    const res = await fetch(API_URL + "?id=" + encodeURIComponent(id), {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error("Échec de la suppression.");
  }

  const FILTERS = [
    { key: "all", label: "Toutes" },
    { key: "nouveau", label: "Nouvelles" },
    { key: "traite", label: "Traitées" },
  ];

  function itemsHtml(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return (
      '<div class="rec-items">' +
      items.map((it) =>
        '<div class="rec-items-row"><span>' + esc((it.qty || 1) + " × " + it.name) + '</span><span>' + esc(formatPrice((it.price || 0) * (it.qty || 1))) + "</span></div>"
      ).join("") +
      "</div>"
    );
  }

  function cardHtml(order) {
    const status = order.status || "nouveau";
    const statusLabel = status === "traite" ? "Traitée" : "Nouvelle";
    return (
      '<div class="rec-card" data-order-id="' + esc(order.id) + '">' +
      '<div class="rec-card-head">' +
      '<div><div class="rec-card-title">' + esc(order.customer_name) + '</div><div class="rec-card-date">' + esc(formatDate(order.created_at)) + "</div></div>" +
      '<span class="rec-status is-' + esc(status) + '">' + esc(statusLabel) + "</span>" +
      "</div>" +
      '<div class="rec-meta"><span class="rec-meta-item"><strong>' + esc(order.customer_phone) + "</strong></span></div>" +
      itemsHtml(order.items) +
      '<div class="rec-total"><span>Total</span><span>' + esc(formatPrice(order.total)) + "</span></div>" +
      '<div class="rec-actions">' +
      '<button type="button" class="rec-btn rec-btn-primary" data-toggle-status="' + esc(order.id) + '" data-current-status="' + esc(status) + '">' +
      (status === "traite" ? "Marquer comme nouvelle" : "Marquer comme traitée") +
      "</button>" +
      '<button type="button" class="rec-btn rec-btn-danger" data-delete="' + esc(order.id) + '">Supprimer</button>' +
      "</div>" +
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
        '<button type="button" class="back-btn" id="cmd-back-error">‹ Retour</button>' +
        '<div class="login-error">' + esc(state.error) + "</div>";
      document.getElementById("cmd-back-error").addEventListener("click", () => window.adminShowDashboard());
      return;
    }

    const filtered = state.filter === "all" ? state.items : state.items.filter((o) => (o.status || "nouveau") === state.filter);

    container.innerHTML =
      '<button type="button" class="back-btn" id="cmd-back">‹ Retour</button>' +
      "<h1>Commandes</h1>" +
      '<p class="dashboard-note">Toutes les commandes passées depuis le panier du site, avec leurs coordonnées.</p>' +
      '<div class="rec-toolbar"><div class="rec-filter">' +
      FILTERS.map((f) => '<button type="button" class="rec-filter-btn' + (state.filter === f.key ? " is-active" : "") + '" data-filter="' + f.key + '">' + esc(f.label) + "</button>").join("") +
      "</div></div>" +
      (filtered.length
        ? '<div class="rec-list">' + filtered.map(cardHtml).join("") + "</div>"
        : '<div class="rec-empty">Aucune commande pour l\'instant.</div>');

    document.getElementById("cmd-back").addEventListener("click", () => window.adminShowDashboard());

    container.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.filter = btn.dataset.filter;
        render();
      });
    });

    container.querySelectorAll("[data-toggle-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.toggleStatus;
        const next = btn.dataset.currentStatus === "traite" ? "nouveau" : "traite";
        btn.disabled = true;
        try {
          await apiSetStatus(id, next);
          const order = state.items.find((o) => o.id === id);
          if (order) order.status = next;
          render();
          if (window.refreshAdminAlerts) window.refreshAdminAlerts();
        } catch (err) {
          btn.disabled = false;
          alert(err.message);
        }
      });
    });

    container.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Supprimer définitivement cette commande ?")) return;
        const id = btn.dataset.delete;
        btn.disabled = true;
        try {
          await apiDelete(id);
          state.items = state.items.filter((o) => o.id !== id);
          render();
          if (window.refreshAdminAlerts) window.refreshAdminAlerts();
        } catch (err) {
          btn.disabled = false;
          alert(err.message);
        }
      });
    });
  }

  window.CommandesEditor = {
    async open() {
      state = { screen: "loading", items: [], filter: "all" };
      render();
      try {
        state.items = await apiList();
        state.screen = "ready";
      } catch (err) {
        state.screen = "error";
        state.error = err.message;
      }
      render();
    },
  };
})();
