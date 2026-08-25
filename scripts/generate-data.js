// Généré au build Vercel : récupère le contenu (burgers, carte, plat du jour,
// offres, réglages réservation) depuis Supabase et écrit un fichier JS statique
// que le site consomme, exactement comme les données codées en dur avant.
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUT_FILE = path.join(__dirname, "..", "data.generated.js");

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies (Vercel > Settings > Environment Variables)."
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.from("site_content").select("key, value");

  if (error) {
    throw new Error("Échec de la récupération du contenu Supabase : " + error.message);
  }

  if (!data || data.length === 0) {
    throw new Error("La table site_content est vide — avez-vous lancé la migration initiale ?");
  }

  const siteData = {};
  for (const row of data) {
    siteData[row.key] = row.value;
  }

  const required = ["burgers", "cartes", "plat_du_jour", "offres", "reservation_settings"];
  const missing = required.filter((k) => !(k in siteData));
  if (missing.length) {
    throw new Error("Clés manquantes dans site_content : " + missing.join(", "));
  }

  const contents =
    "// Fichier généré automatiquement au build — ne pas modifier ni committer.\n" +
    "window.SITE_DATA = " + JSON.stringify(siteData, null, 2) + ";\n";

  fs.writeFileSync(OUT_FILE, contents, { encoding: "utf8" });
  console.log("data.generated.js écrit avec les clés : " + Object.keys(siteData).join(", "));
}

main().catch((err) => {
  console.error("[generate-data] " + err.message);
  process.exit(1);
});
