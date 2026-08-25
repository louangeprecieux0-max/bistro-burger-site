// Généré au build Vercel : récupère le contenu (burgers, carte, plat du jour,
// offres, réglages réservation) depuis Supabase et écrit un fichier JS statique
// que le site consomme, exactement comme les données codées en dur avant.
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const OUT_FILE = path.join(__dirname, "..", "public", "data.generated.js");
const ADMIN_CONFIG_FILE = path.join(__dirname, "..", "public", "admin", "config.generated.js");

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

  const siteData = {};
  for (const row of data || []) {
    siteData[row.key] = row.value;
  }

  const required = ["burgers", "cartes", "plat_du_jour", "offres", "reservation_settings"];
  const missing = required.filter((k) => !(k in siteData));
  if (missing.length) {
    console.warn(
      "[generate-data] Clés absentes dans site_content (le site utilisera son contenu de secours) : " +
        missing.join(", ")
    );
  }

  const contents =
    "// Fichier généré automatiquement au build — ne pas modifier ni committer.\n" +
    "window.SITE_DATA = " + JSON.stringify(siteData, null, 2) + ";\n";

  fs.writeFileSync(OUT_FILE, contents, { encoding: "utf8" });
  console.log("data.generated.js écrit avec les clés : " + Object.keys(siteData).join(", "));

  if (SUPABASE_ANON_KEY) {
    const adminConfig =
      "// Fichier généré automatiquement au build — ne pas modifier ni committer.\n" +
      "window.SUPABASE_CONFIG = " +
      JSON.stringify({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }, null, 2) +
      ";\n";
    fs.mkdirSync(path.dirname(ADMIN_CONFIG_FILE), { recursive: true });
    fs.writeFileSync(ADMIN_CONFIG_FILE, adminConfig, { encoding: "utf8" });
    console.log("admin/config.generated.js écrit.");
  } else {
    console.warn("[generate-data] SUPABASE_ANON_KEY absente — /admin ne pourra pas se connecter.");
  }
}

main().catch((err) => {
  console.error("[generate-data] " + err.message);
  process.exit(1);
});
