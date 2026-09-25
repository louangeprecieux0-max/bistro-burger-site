// Écrit sur disque les fichiers de données du site (utile pour un hébergement
// purement statique). Le serveur Express (server.js) n'en a pas besoin : il
// génère les mêmes fichiers en mémoire. Usage : npm run generate
const fs = require("fs");
const path = require("path");
const { buildSiteFiles } = require("../lib/siteData");

const PUBLIC = path.join(__dirname, "..", "public");

async function main() {
  const files = await buildSiteFiles(process.env);
  const header = "// Fichier généré automatiquement — ne pas modifier ni committer.\n";
  const write = (rel, content) => {
    const target = path.join(PUBLIC, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, header + content, { encoding: "utf8" });
    console.log(rel + " écrit.");
  };
  write("data.generated.js", files.dataJs);
  if (files.adminConfigJs) write("admin/config.generated.js", files.adminConfigJs);
  if (files.appConfigJs) write("app/config.generated.js", files.appConfigJs);
  if (files.sitemapXml) fs.writeFileSync(path.join(PUBLIC, "sitemap.xml"), files.sitemapXml, { encoding: "utf8" });
}

main().catch((err) => {
  console.error("[generate-data] " + err.message);
  process.exit(1);
});
