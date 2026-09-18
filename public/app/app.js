"use strict";
(() => {
  const cfg = window.SUPABASE_CONFIG;
  const errorBox = document.getElementById("login-error");

  if (!cfg || !cfg.url || !cfg.anonKey) {
    errorBox.hidden = false;
    errorBox.textContent = "Configuration manquante. Contactez la personne qui gère le site.";
    return;
  }

  const supabase = window.supabase.createClient(cfg.url, cfg.anonKey);

  async function authHeader() {
    const { data } = await supabase.auth.getSession();
    const token = data.session && data.session.access_token;
    return token ? { Authorization: "Bearer " + token } : {};
  }

  const loginScreen = document.getElementById("login-screen");
  const appView = document.getElementById("app-view");
  const loginForm = document.getElementById("login-form");
  const loginSubmit = document.getElementById("login-submit");
  const logoutBtn = document.getElementById("logout-btn");

  function showLoggedIn() {
    loginScreen.hidden = true;
    appView.hidden = false;
    Reservations.open();
    if (!Reservations.pollTimer) {
      Reservations.pollTimer = setInterval(() => Reservations.reload(), 45000);
    }
    Push.init();
  }

  function showLoggedOut() {
    loginScreen.hidden = false;
    appView.hidden = true;
    if (Reservations.pollTimer) {
      clearInterval(Reservations.pollTimer);
      Reservations.pollTimer = null;
    }
  }

  supabase.auth.getSession().then(({ data }) => {
    if (data.session) showLoggedIn();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) showLoggedIn();
    else showLoggedOut();
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    loginSubmit.disabled = true;
    loginSubmit.textContent = "Connexion…";
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    loginSubmit.disabled = false;
    loginSubmit.textContent = "Se connecter";
    if (error) {
      errorBox.hidden = false;
      errorBox.textContent = "E-mail ou mot de passe incorrect.";
    }
  });

  logoutBtn.addEventListener("click", () => {
    Push.unsubscribe();
    supabase.auth.signOut();
  });

  const forgotPasswordLink = document.getElementById("forgot-password-link");
  const forgotPasswordForm = document.getElementById("forgot-password-form");
  const forgotBackLink = document.getElementById("forgot-back-link");
  const forgotSubmit = document.getElementById("forgot-submit");
  const forgotSuccess = document.getElementById("forgot-success");
  const forgotError = document.getElementById("forgot-error");
  const forgotEmailInput = document.getElementById("forgot-email");

  forgotPasswordLink.addEventListener("click", () => {
    forgotEmailInput.value = document.getElementById("email").value.trim();
    loginForm.hidden = true;
    errorBox.hidden = true;
    forgotSuccess.hidden = true;
    forgotError.hidden = true;
    forgotPasswordForm.hidden = false;
  });
  forgotBackLink.addEventListener("click", () => {
    forgotPasswordForm.hidden = true;
    loginForm.hidden = false;
  });
  forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    forgotSuccess.hidden = true;
    forgotError.hidden = true;
    forgotSubmit.disabled = true;
    forgotSubmit.textContent = "Envoi…";
    const email = forgotEmailInput.value.trim();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/admin/",
    });
    forgotSubmit.disabled = false;
    forgotSubmit.textContent = "Envoyer le lien";
    if (error) {
      forgotError.hidden = false;
      forgotError.textContent = "Échec de l'envoi : " + error.message;
    } else {
      forgotSuccess.hidden = false;
    }
  });

  /* ------------------------------------------------------------------ */
  /* Liste des réservations (confirmer / annuler)                        */
  /* ------------------------------------------------------------------ */
  const Reservations = (() => {
    const API_URL = "/api/admin/reservations";
    const root = document.getElementById("reservations-root");
    let state = null;

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      })[c]);
    }
    function formatDate(iso) {
      try {
        return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
      } catch {
        return iso;
      }
    }
    function formatReservationDate(dateStr) {
      if (!dateStr) return "";
      try {
        return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(dateStr + "T00:00:00"));
      } catch {
        return dateStr;
      }
    }

    async function apiList() {
      const headers = await authHeader();
      const res = await fetch(API_URL, { headers });
      if (!res.ok) throw new Error("Échec du chargement.");
      const json = await res.json();
      return json.items || [];
    }
    async function apiSetStatus(id, status) {
      const headers = await authHeader();
      const res = await fetch(API_URL, {
        method: "PATCH",
        headers: Object.assign({ "Content-Type": "application/json" }, headers),
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour.");
    }

    const FILTERS = [
      { key: "nouveau", label: "En attente" },
      { key: "confirmee", label: "Confirmées" },
      { key: "annulee", label: "Annulées" },
      { key: "all", label: "Toutes" },
    ];
    const STATUS_LABELS = { nouveau: "Nouvelle", confirmee: "Confirmée", annulee: "Annulée" };

    function actionsHtml(r) {
      const status = r.status || "nouveau";
      const btns = [];
      if (status !== "confirmee") btns.push('<button type="button" class="rec-btn rec-btn-primary" data-set-status="' + esc(r.id) + '" data-status="confirmee">Confirmer</button>');
      if (status !== "annulee") btns.push('<button type="button" class="rec-btn rec-btn-danger" data-set-status="' + esc(r.id) + '" data-status="annulee">Annuler</button>');
      if (status !== "nouveau") btns.push('<button type="button" class="rec-btn" data-set-status="' + esc(r.id) + '" data-status="nouveau">Remettre en attente</button>');
      return '<div class="rec-actions">' + btns.join("") + "</div>";
    }
    function infoRow(label, value) {
      if (!value) return "";
      return '<div class="rec-info-row"><span class="rec-info-label">' + esc(label) + '</span><span class="rec-info-value">' + value + "</span></div>";
    }
    function cardHtml(r) {
      const status = r.status || "nouveau";
      const when = r.reservation_date
        ? esc(formatReservationDate(r.reservation_date)) + (r.reservation_time ? " · " + esc(r.reservation_time) : "")
        : "";
      return (
        '<div class="rec-card" data-resa-id="' + esc(r.id) + '">' +
        '<div class="rec-card-head">' +
        '<div><div class="rec-card-title">' + esc(r.name) + '</div><div class="rec-card-date">Reçue le ' + esc(formatDate(r.created_at)) + "</div></div>" +
        '<span class="rec-status is-' + esc(status) + '">' + esc(STATUS_LABELS[status] || status) + "</span>" +
        "</div>" +
        '<div class="rec-info-grid">' +
        infoRow("Téléphone", esc(r.phone)) +
        infoRow("E-mail", r.email ? esc(r.email) : "") +
        infoRow("Réservation", when) +
        infoRow("Couverts", r.party_size ? esc(r.party_size) : "") +
        "</div>" +
        (r.message ? '<p class="rec-note">' + esc(r.message) + "</p>" : "") +
        actionsHtml(r) +
        "</div>"
      );
    }

    function render() {
      if (state.screen === "loading") {
        root.innerHTML = '<div class="editor-loading">Chargement…</div>';
        return;
      }
      if (state.screen === "error") {
        root.innerHTML = '<div class="login-error">' + esc(state.error) + "</div>";
        return;
      }
      const filtered = state.filter === "all" ? state.items : state.items.filter((r) => (r.status || "nouveau") === state.filter);
      root.innerHTML =
        '<div class="rec-toolbar"><div class="rec-filter">' +
        FILTERS.map((f) => '<button type="button" class="rec-filter-btn' + (state.filter === f.key ? " is-active" : "") + '" data-filter="' + f.key + '">' + esc(f.label) + "</button>").join("") +
        "</div></div>" +
        (filtered.length
          ? '<div class="rec-list">' + filtered.map(cardHtml).join("") + "</div>"
          : '<div class="rec-empty">Aucune réservation ici pour l\'instant.</div>');

      root.querySelectorAll("[data-filter]").forEach((btn) => {
        btn.addEventListener("click", () => { state.filter = btn.dataset.filter; render(); });
      });
      root.querySelectorAll("[data-set-status]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.setStatus;
          const status = btn.dataset.status;
          btn.disabled = true;
          try {
            await apiSetStatus(id, status);
            const r = state.items.find((x) => x.id === id);
            if (r) r.status = status;
            render();
          } catch (err) {
            btn.disabled = false;
            alert(err.message);
          }
        });
      });
    }

    return {
      pollTimer: null,
      async open() {
        state = { screen: "loading", items: [], filter: "nouveau" };
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
      async reload() {
        if (!state || state.screen !== "ready") return;
        try {
          state.items = await apiList();
          render();
        } catch {}
      },
    };
  })();

  /* ------------------------------------------------------------------ */
  /* Notifications push                                                  */
  /* ------------------------------------------------------------------ */
  const Push = (() => {
    const banner = document.getElementById("push-banner");
    const bannerText = document.getElementById("push-banner-text");
    const enableBtn = document.getElementById("push-enable-btn");
    const iosBanner = document.getElementById("ios-banner");

    function urlBase64ToUint8Array(base64String) {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
      return outputArray;
    }

    function isStandalone() {
      return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    }
    function isIOS() {
      return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    }

    async function subscribeToPush() {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey),
        });
      }
      const headers = await authHeader();
      await fetch("/api/app/subscribe", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, headers),
        body: JSON.stringify(subscription),
      });
      banner.hidden = true;
    }

    async function unsubscribe() {
      try {
        if (!("serviceWorker" in navigator)) return;
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      } catch {}
    }

    return {
      unsubscribe,
      async init() {
        if (!cfg.vapidPublicKey) return; // notifications push pas encore configurées côté serveur
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

        if (isIOS() && !isStandalone()) {
          iosBanner.hidden = false;
          return;
        }

        try {
          const registration = await navigator.serviceWorker.register("sw.js");
          await navigator.serviceWorker.ready;
          const existing = await registration.pushManager.getSubscription();
          if (existing) {
            const headers = await authHeader();
            fetch("/api/app/subscribe", {
              method: "POST",
              headers: Object.assign({ "Content-Type": "application/json" }, headers),
              body: JSON.stringify(existing),
            }).catch(() => {});
            return;
          }
          if (Notification.permission === "denied") return;
          bannerText.textContent = "Activez les notifications pour être prévenu dès qu'une réservation arrive.";
          banner.hidden = false;
          enableBtn.addEventListener("click", async () => {
            enableBtn.disabled = true;
            try {
              const perm = await Notification.requestPermission();
              if (perm !== "granted") {
                bannerText.textContent = "Notifications refusées. Vous pouvez les autoriser plus tard dans les réglages du téléphone.";
                return;
              }
              await subscribeToPush();
            } catch (err) {
              bannerText.textContent = "Échec de l'activation des notifications.";
            } finally {
              enableBtn.disabled = false;
            }
          }, { once: true });
        } catch {}
      },
    };
  })();
})();
