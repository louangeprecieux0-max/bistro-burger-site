// Généré au build Vercel : récupère le contenu (burgers, carte, plat du jour,
// offres, réglages réservation) depuis Supabase et écrit un fichier JS statique
// que le site consomme, exactement comme les données codées en dur avant.
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const OUT_FILE = path.join(__dirname, "..", "public", "data.generated.js");
const ADMIN_CONFIG_FILE = path.join(__dirname, "..", "public", "admin", "config.generated.js");
const APP_CONFIG_FILE = path.join(__dirname, "..", "public", "app", "config.generated.js");

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
  if (RECAPTCHA_SITE_KEY) siteData.recaptchaSiteKey = RECAPTCHA_SITE_KEY;

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

  // Sitemap : ajoute les articles du blog (ne doit jamais faire échouer le build).
  try {
    const blog = siteData.blog;
    if (blog && Array.isArray(blog.posts)) {
      const origin = "https://bistro-burger-site.vercel.app";
      const urls = [
        { loc: origin + "/", freq: "weekly", prio: "1.0" },
        { loc: origin + "/blog/index.html", freq: "weekly", prio: "0.8" },
      ];
      blog.posts
        .filter((p) => p && p.slug && p.published !== false)
        .forEach((p) => urls.push({ loc: origin + "/blog/" + encodeURIComponent(p.slug) + ".html", freq: "monthly", prio: "0.6", lastmod: p.date }));
      const xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls
          .map((u) => "  <url>\n    <loc>" + u.loc + "</loc>\n" + (u.lastmod ? "    <lastmod>" + u.lastmod + "</lastmod>\n" : "") + "    <changefreq>" + u.freq + "</changefreq>\n    <priority>" + u.prio + "</priority>\n  </url>")
          .join("\n") +
        "\n</urlset>\n";
      fs.writeFileSync(path.join(__dirname, "..", "public", "sitemap.xml"), xml, { encoding: "utf8" });
      console.log("sitemap.xml régénéré (" + urls.length + " URLs).");
    }
  } catch (err) {
    console.warn("[generate-data] Sitemap non régénéré : " + err.message);
  }
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

  if (SUPABASE_ANON_KEY) {
    const appConfig =
      "// Fichier généré automatiquement au build — ne pas modifier ni committer.\n" +
      "window.SUPABASE_CONFIG = " +
      JSON.stringify(
        { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, vapidPublicKey: VAPID_PUBLIC_KEY || null },
        null,
        2
      ) +
      ";\n";
    fs.mkdirSync(path.dirname(APP_CONFIG_FILE), { recursive: true });
    fs.writeFileSync(APP_CONFIG_FILE, appConfig, { encoding: "utf8" });
    console.log("app/config.generated.js écrit.");
  } else {
    console.warn("[generate-data] SUPABASE_ANON_KEY absente — /app ne pourra pas se connecter.");
  }
}

main().catch((err) => {
  console.error("[generate-data] " + err.message);
  process.exit(1);
});
