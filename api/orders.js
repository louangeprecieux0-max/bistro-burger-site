// API publique : enregistre une commande (panier + upsell) dans Supabase
// pour qu'elle soit consultable depuis l'espace admin.
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Configuration serveur manquante." });
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
  body = body || {};

  const customerName = String(body.customerName || "").trim();
  const customerPhone = String(body.customerPhone || "").trim();
  const items = Array.isArray(body.items) ? body.items : [];
  const total = Number(body.total) || 0;

  if (!customerName || !customerPhone || !items.length) {
    res.status(400).json({ error: "Nom, téléphone et articles requis." });
    return;
  }

  const row = {
    customer_name: customerName,
    customer_phone: customerPhone,
    items,
    total,
  };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("orders").insert(row);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ ok: true });
};
