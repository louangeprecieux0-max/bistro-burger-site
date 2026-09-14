// API publique : enregistre une demande de réservation dans Supabase
// pour qu'elle soit consultable depuis l'espace admin.
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALERT_EMAIL = "louangeprecieux0@gmail.com";

async function sendAlertEmail(row) {
  try {
    const params = new URLSearchParams();
    params.set("_subject", "Nouvelle réservation — Bistro Burger");
    params.set("nom", row.name);
    params.set("téléphone", row.phone);
    params.set("email", row.email || "");
    params.set("date", row.reservation_date || "");
    params.set("heure", row.reservation_time || "");
    params.set("couverts", row.party_size || "");
    if (row.message) params.set("message", row.message);
    await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(ALERT_EMAIL), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
  } catch {}
}

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

  await sendAlertEmail(row);

  res.status(200).json({ ok: true });
};
