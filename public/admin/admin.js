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
  const dashboardView = document.getElementById("dashboard-view");
  const burgersView = document.getElementById("burgers-view");
  const pageTitle = document.getElementById("page-title");
  const userEmailEl = document.getElementById("user-email");
  const userAvatarEl = document.getElementById("user-avatar");
  const dashboardFirstnameEl = document.getElementById("dashboard-firstname");
  const loginForm = document.getElementById("login-form");
  const loginSubmit = document.getElementById("login-submit");
  const logoutBtn = document.getElementById("logout-btn");
  const navDashboard = document.getElementById("nav-dashboard");
  const navBurgers = document.getElementById("nav-burgers");
  const navBurgersCard = document.getElementById("nav-burgers-card");

  const sidebar = document.getElementById("app-sidebar");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const hamburgerBtn = document.getElementById("hamburger-btn");

  const PAGES = { dashboard: "Accueil", burgers: "Les burgers" };

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    sidebarBackdrop.classList.remove("is-visible");
  }

  hamburgerBtn.addEventListener("click", () => {
    sidebar.classList.toggle("is-open");
    sidebarBackdrop.classList.toggle("is-visible");
  });
  sidebarBackdrop.addEventListener("click", closeSidebar);

  function showSection(view) {
    dashboardView.hidden = view !== "dashboard";
    burgersView.hidden = view !== "burgers";
    pageTitle.textContent = PAGES[view] || "";
    navDashboard.classList.toggle("is-active", view === "dashboard");
    navBurgers.classList.toggle("is-active", view === "burgers");
    closeSidebar();
    window.scrollTo(0, 0);
  }
  window.adminShowDashboard = () => showSection("dashboard");

  function openBurgers() {
    showSection("burgers");
    window.BurgersEditor.open();
  }

  navDashboard.addEventListener("click", () => showSection("dashboard"));
  navBurgers.addEventListener("click", openBurgers);
  navBurgersCard.addEventListener("click", openBurgers);

  function showLoggedIn(session) {
    const email = session.user.email;
    userEmailEl.textContent = email;
    userAvatarEl.textContent = email.charAt(0).toUpperCase();
    dashboardFirstnameEl.textContent = email.split("@")[0];
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

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  const passwordForm = document.getElementById("password-form");
  const passwordSubmit = document.getElementById("password-submit");
  const passwordSuccess = document.getElementById("password-success");
  const passwordError = document.getElementById("password-error");
  const togglePasswordForm = document.getElementById("toggle-password-form");

  togglePasswordForm.addEventListener("click", () => {
    passwordForm.hidden = !passwordForm.hidden;
    togglePasswordForm.textContent = passwordForm.hidden ? "Changer mon mot de passe" : "Annuler";
  });

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
