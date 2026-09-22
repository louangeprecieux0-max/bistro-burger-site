// API de l'outil SEO autonome : récupère le HTML d'une page (même sur un
// autre site) depuis le serveur, pour contourner le blocage entre sites
// que les navigateurs appliquent au JavaScript. Protégée par le jeton de
// l'outil (voir api/seo/login.js) ; ne touche à aucune donnée du site.
const { validToken } = require("../_lib/seoAuth");

const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 12000;

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

module.exports = async (req, res) => {
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
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
};
