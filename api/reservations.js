// API publique : enregistre une demande de réservation dans Supabase
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

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  if (!name || !phone) {
    res.status(400).json({ error: "Nom et téléphone requis." });
    return;
  }

  const row = {
    name,
    phone,
    email: body.email ? String(body.email).trim() : null,
    reservation_date: body.date || null,
    reservation_time: body.time ? String(body.time).trim() : null,
    party_size: body.partySize ? String(body.partySize).trim() : null,
    message: body.message ? String(body.message).trim() : null,
  };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("reservations").insert(row);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ ok: true });
};
