// API protégée pour l'espace admin : lecture/écriture du contenu du site
// dans Supabase, puis déclenchement d'un redéploiement Vercel.
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEPLOY_HOOK_URL = process.env.DEPLOY_HOOK_URL;

const ALLOWED_KEYS = ["burgers", "cartes", "plat_du_jour", "offres", "reservation_settings"];

async function requireUser(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

module.exports = async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Configuration serveur manquante." });
    return;
  }

  const user = await requireUser(req);
  if (!user) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  if (req.method === "GET") {
    const key = req.query.key;
    if (!ALLOWED_KEYS.includes(key)) {
      res.status(400).json({ error: "Clé invalide." });
      return;
    }
    const { data, error } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ value: data.value });
    return;
  }

  if (req.method === "PUT") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        res.status(400).json({ error: "Corps de requête invalide." });
        return;
      }
    }
    const { key, value } = body || {};
    if (!ALLOWED_KEYS.includes(key) || value === undefined) {
      res.status(400).json({ error: "Clé ou valeur invalide." });
      return;
    }

    const { error } = await supabase
      .from("site_content")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (DEPLOY_HOOK_URL) {
      fetch(DEPLOY_HOOK_URL, { method: "POST" }).catch(() => {});
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Méthode non autorisée." });
};
