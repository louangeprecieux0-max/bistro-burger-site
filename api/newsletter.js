// API publique : inscrit une adresse e-mail à la newsletter via Brevo.
// N'écrit rien tant que BREVO_API_KEY et BREVO_LIST_ID ne sont pas configurées
// (contrairement aux autres formulaires du site, ici il n'y a pas de résultat
// utile sans ces clés : on répond une erreur claire plutôt qu'un faux succès).
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }
  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    res.status(503).json({ error: "La newsletter n'est pas encore activée. Contactez la personne qui gère le site." });
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

  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Adresse e-mail invalide." });
    return;
  }

  try {
    const brevoRes = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        listIds: [Number(BREVO_LIST_ID)],
        updateEnabled: true,
      }),
    });

    // Brevo répond 204 (créé), ou 400 "duplicate_parameter" si déjà inscrit :
    // dans les deux cas c'est un succès du point de vue du visiteur.
    if (brevoRes.ok || brevoRes.status === 204) {
      res.status(200).json({ ok: true });
      return;
    }
    const errJson = await brevoRes.json().catch(() => ({}));
    if (errJson.code === "duplicate_parameter") {
      res.status(200).json({ ok: true, alreadySubscribed: true });
      return;
    }
    res.status(502).json({ error: "L'inscription a échoué. Réessayez dans un instant." });
  } catch {
    res.status(502).json({ error: "L'inscription a échoué. Réessayez dans un instant." });
  }
};
