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

  const topbar = document.getElementById("topbar");
  const loginView = document.getElementById("login-view");
  const dashboardView = document.getElementById("dashboard-view");
  const userEmailEl = document.getElementById("user-email");
  const dashboardEmailEl = document.getElementById("dashboard-email");
  const loginForm = document.getElementById("login-form");
  const loginSubmit = document.getElementById("login-submit");
  const logoutBtn = document.getElementById("logout-btn");

  function showLoggedIn(session) {
    const email = session.user.email;
    userEmailEl.textContent = email;
    dashboardEmailEl.textContent = email;
    topbar.hidden = false;
    loginView.hidden = true;
    dashboardView.hidden = false;
  }

  function showLoggedOut() {
    topbar.hidden = true;
    loginView.hidden = false;
    dashboardView.hidden = true;
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
})();
