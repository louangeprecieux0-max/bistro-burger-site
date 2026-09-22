// API de l'outil SEO autonome : vérifie le mot de passe (propre à cet outil,
// indépendant des comptes admin du site) et renvoie un jeton de session.
// N'écrit ni ne lit aucune donnée : aucune base nécessaire.
const { SEO_TOOL_PASSWORD, issueToken } = require("../_lib/seoAuth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }
  if (!SEO_TOOL_PASSWORD) {
    res.status(503).json({ error: "Cet outil n'est pas encore configuré (mot de passe manquant)." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Corps de requête invalide." });
      return;
    }
  }
  const password = String((body || {}).password || "");

  if (password !== SEO_TOOL_PASSWORD) {
    res.status(401).json({ error: "Mot de passe incorrect." });
    return;
  }

  res.status(200).json({ token: issueToken() });
};
