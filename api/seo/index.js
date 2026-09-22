// API de l'outil SEO autonome : connexion (mot de passe dédié ou session
// admin déjà ouverte) et relais serveur pour charger une page d'un autre
// site (contourne le blocage entre sites des navigateurs). Regroupées dans
// un seul fichier pour rester sous la limite de fonctions du plan Vercel.
const { createClient } = require("@supabase/supabase-js");
const { SEO_TOOL_PASSWORD, issueToken, validToken } = require("../_lib/seoAuth");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12000;

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

async function handleLogin(req, res) {
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
}

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "0.0.0.0" || h === "::1" || h === "::") return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (h.endsWith(".internal") || h.endsWith(".local")) return true;
  return false;
}

async function handleFetch(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }
  if (!validToken(req.headers["x-seo-token"])) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  let target;
  try {
    target = new URL(String(req.query.url || ""));
  } catch {
    res.status(400).json({ error: "Adresse invalide." });
    return;
  }
  if (!/^https?:$/.test(target.protocol)) {
    res.status(400).json({ error: "Seules les adresses http et https sont acceptées." });
    return;
  }
  if (isBlockedHost(target.hostname)) {
    res.status(400).json({ error: "Cette adresse n'est pas autorisée." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(target.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BistroBurgerSeoTool/1.0; usage interne)",
        Accept: "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });
    clearTimeout(timeout);

    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      res.status(413).json({ error: "Cette page est trop volumineuse pour être analysée." });
      return;
    }
    const html = Buffer.from(buf).toString("utf8");
    res.status(200).json({
      ok: r.ok,
      status: r.status,
      url: r.url || target.toString(),
      contentType: r.headers.get("content-type") || "",
      html,
    });
  } catch (err) {
    clearTimeout(timeout);
    const timedOut = err && err.name === "AbortError";
    res.status(502).json({ error: timedOut ? "La page met trop de temps à répondre." : "Impossible de charger cette page." });
  }
}

module.exports = async (req, res) => {
  const action = req.query.action;
  if (action === "login") return handleLogin(req, res);
  if (action === "fetch") return handleFetch(req, res);
  res.status(400).json({ error: "Action inconnue." });
};
