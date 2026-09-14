// API protégée pour l'espace admin : nombre de commandes et réservations
// en attente (statut "nouveau"), pour afficher des pastilles d'alerte.
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  if (req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const [ordersRes, reservationsRes] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "nouveau"),
    supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "nouveau"),
  ]);

  if (ordersRes.error) {
    res.status(500).json({ error: ordersRes.error.message });
    return;
  }
  if (reservationsRes.error) {
    res.status(500).json({ error: reservationsRes.error.message });
    return;
  }

  res.status(200).json({
    newOrders: ordersRes.count || 0,
    newReservations: reservationsRes.count || 0,
  });
};
