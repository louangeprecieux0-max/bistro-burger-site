// Utilitaire partagé : jeton de session pour l'outil SEO autonome
// (public/seo/), protégé par un simple mot de passe indépendant des
// comptes admin du site.
const crypto = require("crypto");

const SEO_TOOL_PASSWORD = process.env.SEO_TOOL_PASSWORD;
const SESSION_LABEL = "seo-tool-session";

function issueToken() {
  if (!SEO_TOOL_PASSWORD) return null;
  return crypto.createHmac("sha256", SEO_TOOL_PASSWORD).update(SESSION_LABEL).digest("hex");
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
