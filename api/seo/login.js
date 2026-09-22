// API de l'outil SEO autonome : ouvre une session soit avec le mot de passe
// propre à cet outil (utilisable pour n'importe quel site, indépendant des
// comptes admin), soit automatiquement pour une personne déjà connectée à
// l'espace admin (jeton Supabase envoyé en en-tête Authorization).
const { createClient } = require("@supabase/supabase-js");
const { SEO_TOOL_PASSWORD, issueToken } = require("../_lib/seoAuth");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function adminUserFromRequest(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const adminUser = await adminUserFromRequest(req);
  if (adminUser) {
    res.status(200).json({ token: issueToken() });
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
