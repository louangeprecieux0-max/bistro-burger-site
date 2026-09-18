// API publique : enregistre une demande de réservation dans Supabase
// pour qu'elle soit consultable depuis l'espace admin.
const { createClient } = require("@supabase/supabase-js");
const { notifyAdmins } = require("./_lib/notify");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const ALERT_EMAIL = "louangeprecieux0@gmail.com";

async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) return true; // captcha non configuré : ne bloque pas les réservations
  if (!token) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: RECAPTCHA_SECRET_KEY, response: token }),
    });
    const json = await res.json();
    return !!json.success;
  } catch {
    return false;
  }
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

  const recaptchaOk = await verifyRecaptcha(body.recaptchaToken);
  if (!recaptchaOk) {
    res.status(400).json({ error: "Vérification anti-robot invalide." });
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

  await notifyAdmins(supabase, ALERT_EMAIL, "Nouvelle réservation — Bistro Burger", {
    nom: row.name,
    téléphone: row.phone,
    email: row.email,
    date: row.reservation_date,
    heure: row.reservation_time,
    couverts: row.party_size,
    message: row.message,
  });

  res.status(200).json({ ok: true });
};
