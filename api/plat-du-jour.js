// API publique, lecture seule : renvoie le plat du jour / les suggestions
// directement depuis Supabase, pour un affichage à jour sans attendre le
// prochain déploiement complet du site (déclenché par ailleurs à chaque
// enregistrement admin, mais qui prend 30 à 60 secondes).
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Configuration serveur manquante." });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "plat_du_jour")
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=45");
  res.status(200).json({ value: data ? data.value : null });
};
