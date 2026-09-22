// Utilitaire partagé : jeton de session pour l'outil SEO autonome
// (public/seo/), accessible soit avec un mot de passe indépendant des
// comptes admin, soit automatiquement pour une session admin déjà ouverte.
const crypto = require("crypto");

const SEO_TOOL_PASSWORD = process.env.SEO_TOOL_PASSWORD;
const SESSION_LABEL = "seo-tool-session";
// Clé de signature du jeton : le mot de passe dédié si défini, sinon la clé
// de service Supabase (déjà utilisée côté serveur) — pour que la connexion
// automatique depuis l'admin fonctionne même sans mot de passe configuré.
const SIGNING_KEY = SEO_TOOL_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY;

function issueToken() {
  if (!SIGNING_KEY) return null;
  return crypto.createHmac("sha256", SIGNING_KEY).update(SESSION_LABEL).digest("hex");
}

function validToken(token) {
  const expected = issueToken();
  if (!expected || !token) return false;
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { SEO_TOOL_PASSWORD, issueToken, validToken };
