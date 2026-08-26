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

  window.adminAuth = {
    supabase,
    async authHeader() {
      const { data } = await supabase.auth.getSession();
      const token = data.session && data.session.access_token;
      return token ? { Authorization: "Bearer " + token } : {};
    },
  };

  const loginScreen = document.getElementById("login-screen");
  const appShell = document.getElementById("app-shell");
  const pageTitle = document.getElementById("page-title");
  const userEmailEl = document.getElementById("user-email");
  const userAvatarEl = document.getElementById("user-avatar");
  const dashboardFirstnameEl = document.getElementById("dashboard-firstname");
  const ppAvatarEl = document.getElementById("pp-avatar");
  const ppNameEl = document.getElementById("pp-name");
  const ppEmailEl = document.getElementById("pp-email");
  const loginForm = document.getElementById("login-form");
  const loginSubmit = document.getElementById("login-submit");
  const logoutBtn = document.getElementById("logout-btn");
  const logoutBtnPanel = document.getElementById("logout-btn-panel");

  const sidebar = document.getElementById("app-sidebar");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const sidebarCollapseBtn = document.getElementById("sidebar-collapse-btn");

  try {
    if (localStorage.getItem("bb-admin-sidebar-collapsed") === "1") {
      sidebar.classList.add("is-collapsed");
    }
  } catch {}

  sidebarCollapseBtn.addEventListener("click", () => {
    const collapsed = sidebar.classList.toggle("is-collapsed");
    try {
      localStorage.setItem("bb-admin-sidebar-collapsed", collapsed ? "1" : "0");
    } catch {}
  });

  // Une entrée par section : editor est optionnel (le tableau de bord n'en a pas).
  const SECTIONS = [
    { key: "dashboard", title: "Accueil" },
    { key: "burgers", title: "Les burgers", editor: () => window.BurgersEditor },
    { key: "carte", title: "La carte", editor: () => window.CarteEditor },
    { key: "platdujour", title: "Plat du jour", editor: () => window.PlatDuJourEditor },
    { key: "offres", title: "Offres", editor: () => window.OffresEditor },
    { key: "reservations", title: "Réservations", editor: () => window.ReservationsEditor },
  ];

  SECTIONS.forEach((s) => {
    s.viewEl = document.getElementById(s.key + "-view");
    s.navEl = document.getElementById("nav-" + s.key);
    s.cardEl = document.getElementById("nav-" + s.key + "-card");
  });

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    sidebarBackdrop.classList.remove("is-visible");
  }

  hamburgerBtn.addEventListener("click", () => {
    sidebar.classList.toggle("is-open");
    sidebarBackdrop.classList.toggle("is-visible");
  });
  sidebarBackdrop.addEventListener("click", closeSidebar);

  function showSection(key) {
    SECTIONS.forEach((s) => {
      if (s.viewEl) s.viewEl.hidden = s.key !== key;
      if (s.navEl) s.navEl.classList.toggle("is-active", s.key === key);
    });
    const active = SECTIONS.find((s) => s.key === key);
    pageTitle.textContent = (active && active.title) || "";
    closeSidebar();
    window.scrollTo(0, 0);
  }
  window.adminShowDashboard = () => showSection("dashboard");

  SECTIONS.forEach((s) => {
    const open = () => {
      showSection(s.key);
      if (s.editor) s.editor().open();
    };
    if (s.navEl) s.navEl.addEventListener("click", open);
    if (s.cardEl) s.cardEl.addEventListener("click", open);
  });

  function showLoggedIn(session) {
    const email = session.user.email;
    userEmailEl.textContent = email;
    userAvatarEl.textContent = email.charAt(0).toUpperCase();
    dashboardFirstnameEl.textContent = email.split("@")[0];
    ppAvatarEl.textContent = email.charAt(0).toUpperCase();
    ppNameEl.textContent = email.split("@")[0];
    ppEmailEl.textContent = email;
    loginScreen.hidden = true;
    appShell.hidden = false;
    showSection("dashboard");
  }

  function showLoggedOut() {
    loginScreen.hidden = false;
    appShell.hidden = true;
  }

  supabase.auth.getSession().then(({ data }) => {
    if (data.session) showLoggedIn(data.session);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) showLoggedIn(session);
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

  async function doLogout() {
    await supabase.auth.signOut();
  }
  logoutBtn.addEventListener("click", doLogout);
  logoutBtnPanel.addEventListener("click", doLogout);

  const profileTrigger = document.getElementById("profile-trigger");
  const profilePanel = document.getElementById("profile-panel");
  const profilePanelBackdrop = document.getElementById("profile-panel-backdrop");
  const profilePanelClose = document.getElementById("profile-panel-close");

  function openProfilePanel() {
    profilePanel.classList.add("is-open");
    profilePanelBackdrop.classList.add("is-visible");
  }
  function closeProfilePanel() {
    profilePanel.classList.remove("is-open");
    profilePanelBackdrop.classList.remove("is-visible");
  }
  profileTrigger.addEventListener("click", openProfilePanel);
  profilePanelClose.addEventListener("click", closeProfilePanel);
  profilePanelBackdrop.addEventListener("click", closeProfilePanel);

  function wireExpandableRow(rowId, formId) {
    const row = document.getElementById(rowId);
    const form = document.getElementById(formId);
    row.addEventListener("click", () => {
      form.hidden = !form.hidden;
      row.classList.toggle("is-open", !form.hidden);
    });
  }
  wireExpandableRow("pp-password-toggle", "password-form");
  wireExpandableRow("pp-invite-toggle", "invite-form");

  const inviteForm = document.getElementById("invite-form");
  const inviteSubmit = document.getElementById("invite-submit");
  const inviteSuccess = document.getElementById("invite-success");
  const inviteError = document.getElementById("invite-error");

  inviteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    inviteSuccess.hidden = true;
    inviteError.hidden = true;
    inviteSubmit.disabled = true;
    inviteSubmit.textContent = "Envoi…";

    const email = document.getElementById("invite-email").value.trim();

    try {
      const headers = await window.adminAuth.authHeader();
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, headers),
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'envoi.");
      inviteSuccess.hidden = false;
      inviteForm.reset();
    } catch (err) {
      inviteError.hidden = false;
      inviteError.textContent = err.message;
    } finally {
      inviteSubmit.disabled = false;
      inviteSubmit.textContent = "Envoyer l'invitation";
    }
  });

  const passwordForm = document.getElementById("password-form");
  const passwordSubmit = document.getElementById("password-submit");
  const passwordSuccess = document.getElementById("password-success");
  const passwordError = document.getElementById("password-error");

  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    passwordSuccess.hidden = true;
    passwordError.hidden = true;
    passwordSubmit.disabled = true;
    passwordSubmit.textContent = "Enregistrement…";

    const newPassword = document.getElementById("new-password").value;
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    passwordSubmit.disabled = false;
    passwordSubmit.textContent = "Enregistrer le mot de passe";

    if (error) {
      passwordError.hidden = false;
      passwordError.textContent = "Échec de l'enregistrement : " + error.message;
    } else {
      passwordSuccess.hidden = false;
      passwordForm.reset();
    }
  });

  const EYE_OPEN =
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>';
  const EYE_CLOSED =
    '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-3.66 4.94M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';

  document.querySelectorAll(".field-toggle").forEach((btn) => {
    const input = document.getElementById(btn.dataset.toggleFor);
    const svg = btn.querySelector("svg");
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      svg.innerHTML = show ? EYE_CLOSED : EYE_OPEN;
      btn.classList.toggle("is-visible", show);
      btn.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
    });
  });
})();
