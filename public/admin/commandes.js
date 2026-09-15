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

  const RESTAURANT = {
    name: "Bistro Burger",
    address: "ZAC Avon, Bretelle de la Plaine, 13120 Gardanne",
    phone: "04 65 84 89 18",
    email: "brasserie.zone.avon@gmail.com",
  };

  function shortId(id) {
    return String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  }

  function downloadInvoice(order) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("Le générateur de facture n'a pas pu se charger. Vérifiez votre connexion et réessayez.");
      return;
    }
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const marginX = 18;
    let y = 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(RESTAURANT.name, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    y += 6;
    doc.text(RESTAURANT.address, marginX, y);
    y += 5;
    doc.text(RESTAURANT.phone + "  ·  " + RESTAURANT.email, marginX, y);

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("FACTURE", pageW - marginX, 22, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text("N° " + shortId(order.id), pageW - marginX, 28, { align: "right" });
    doc.text(formatDate(order.created_at), pageW - marginX, 33, { align: "right" });

    y = 46;
    doc.setDrawColor(220, 213, 201);
    doc.line(marginX, y, pageW - marginX, y);

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    doc.text("Client", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(order.customer_name || "", marginX, y);
    y += 5.5;
    doc.text(order.customer_phone || "", marginX, y);

    y += 10;
    doc.setFillColor(27, 109, 95);
    doc.rect(marginX, y, pageW - marginX * 2, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("ARTICLE", marginX + 3, y + 6);
    doc.text("QTÉ", pageW - marginX - 45, y + 6, { align: "right" });
    doc.text("PRIX", pageW - marginX - 24, y + 6, { align: "right" });
    doc.text("TOTAL", pageW - marginX - 3, y + 6, { align: "right" });
    y += 9;

    const items = Array.isArray(order.items) ? order.items : [];
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    items.forEach((it, i) => {
      const qty = it.qty || 1;
      const price = it.price || 0;
      if (i % 2 === 1) {
        doc.setFillColor(246, 243, 238);
        doc.rect(marginX, y, pageW - marginX * 2, 8, "F");
      }
      doc.text(String(it.name || ""), marginX + 3, y + 5.5);
      doc.text(String(qty), pageW - marginX - 45, y + 5.5, { align: "right" });
      doc.text(formatPrice(price), pageW - marginX - 24, y + 5.5, { align: "right" });
      doc.text(formatPrice(price * qty), pageW - marginX - 3, y + 5.5, { align: "right" });
      y += 8;
    });

    y += 4;
    doc.setDrawColor(220, 213, 201);
    doc.line(marginX, y, pageW - marginX, y);
    y += 9;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(20, 20, 20);
    doc.text("Total", marginX, y);
    doc.text(formatPrice(order.total), pageW - marginX, y, { align: "right" });

    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 140);
    doc.text("Reçu de commande généré automatiquement, à titre de justificatif d'achat.", marginX, y);

    doc.save("facture-" + shortId(order.id) + ".pdf");
  }

  function infoRow(label, value) {
    if (!value) return "";
    return '<div class="rec-info-row"><span class="rec-info-label">' + esc(label) + '</span><span class="rec-info-value">' + value + "</span></div>";
  }

  function itemsHtml(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return (
      '<div class="rec-items">' +
      '<div class="rec-items-head"><span>Article</span><span>Total</span></div>' +
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
      '<div class="rec-info-grid">' + infoRow("Téléphone", esc(order.customer_phone)) + "</div>" +
      itemsHtml(order.items) +
      '<div class="rec-total"><span>Total</span><span>' + esc(formatPrice(order.total)) + "</span></div>" +
      '<div class="rec-actions">' +
      '<button type="button" class="rec-btn rec-btn-primary" data-toggle-status="' + esc(order.id) + '" data-current-status="' + esc(status) + '">' +
      (status === "traite" ? "Marquer comme nouvelle" : "Marquer comme traitée") +
      "</button>" +
      '<button type="button" class="rec-btn" data-invoice="' + esc(order.id) + '">⬇ Télécharger</button>' +
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

    container.querySelectorAll("[data-invoice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.invoice;
        const order = state.items.find((o) => o.id === id);
        if (order) downloadInvoice(order);
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
