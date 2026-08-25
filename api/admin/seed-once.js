// Script de migration à usage unique : copie le contenu actuellement codé en
// dur dans script.js/index.html vers la table Supabase site_content.
// Appelé une seule fois manuellement après la création de la base, puis supprimé.
const { createClient } = require("@supabase/supabase-js");

const SEED_TOKEN = "bb-seed-2026-gardanne";

const BURGERS = [
  { title: "Les originaux", items: [
    { name: "Classique", desc: "Bun's², iceberg, tomate, steak, double cheddar, compotée d'oignons maison, sauce de notre enfance", sur: "16 €", emp: "13 €" },
    { name: "Smash", desc: "Bun's², steak smashé, double cheddar, oignons rouges, cornichon, smashed sauce", sur: "16 €", emp: "13 €" },
    { name: "Black Peppers", desc: "Bun's², steak, roquette, tomate, cheddar poivré, compotée d'oignons maison, oignons frits, lard fumé, sauce au poivre", sur: "16 €", emp: "15 €" },
    { name: "Cow-Boy", desc: "Bun's², tenders de poulet, double cheddar, coleslaw maison, cornichon", sur: "16 €", emp: "13 €" },
    { name: "Fisher", desc: "Bun's², iceberg, tomate, dos de cabillaud pané, double cheddar, sauce tartare maison", sur: "19 €", emp: "16 €" }
  ] },
  { title: "Les effilochés", items: [
    { name: "Pull-Pork", desc: "Bun's², effiloché de porc maison confit à la bière, double cheddar, coleslaw maison, sauce barbecue", sur: "18 €", emp: "15 €" },
    { name: "Pull-Beef", desc: "Bun's², effiloché de bœuf bourguignon, roquette, tomate, compotée d'oignons maison, emmental", sur: "19 €", emp: "16 €" },
    { name: "Pull-Duck", desc: "Bun's², roquette, tomate, effiloché de canard confit à l'échalote, chèvre, sauce moutarde miel", sur: "20 €", emp: "17 €", img: "assets/pulled-duck.jpg" }
  ] },
  { title: "Les signatures BB", items: [
    { name: "Le Poulpe", desc: "Pain roll, tentacule de poulpe, légumes rôtis, persillade, salade, sauce mayo sriracha, cheddar épicé", sur: "21 €", emp: "18 €" },
    { name: "Le Cam", desc: "Bun's², steak smashé, double cheddar, oignon rouge, galette de camembert pané maison, smashed sauce", sur: "18 €", emp: "15 €", img: "assets/le-cam.png" },
    { name: "Le Big BB", desc: "Bun's², iceberg, galette de bleu d'Auvergne pané, double steak, double cheddar, tomate, compotée d'oignons maison, sauce enfance", sur: "22 €", emp: "19 €", img: "assets/big-bb.png" }
  ] }
];

const CARTES = {
  "Sur place": {
    "Apéro": [
      { title: "À partager", items: [
        { name: "Mini-Burger", desc: "Par 4", price: "10 €" },
        { name: "Chili Cheese maison", desc: "Par 4", price: "6 €" },
        { name: "Stick de mozzarella", desc: "Par 6", price: "6 €" },
        { name: "Tenders de poulet", desc: "Par 6", price: "6 €" },
        { name: "Panisses artisanales", desc: "Par 7", price: "7 €" },
        { name: "Camembert pané", desc: "Par 6", price: "6 €" },
        { name: "Onion Rings", desc: "Par 6", price: "6 €" },
        { name: "Planche mixte apéro", desc: "Un peu de tout", price: "40 €" }
      ] },
      { title: "Nos spritz", items: [
        { name: "Apérol Spritz", desc: "Apérol, prosecco, eau gazeuse", price: "8 €" },
        { name: "Campari Spritz", desc: "Campari, prosecco, eau gazeuse", price: "8 €" },
        { name: "Capo Spritz", desc: "Cap Mattei, prosecco, eau gazeuse", price: "10 €" },
        { name: "St Germain Spritz", desc: "St-Germain, prosecco, eau gazeuse", price: "12 €" }
      ] },
      { title: "Nos cocktails", items: [
        { name: "Cuba libre", desc: "Rhum, coca-cola, citron vert", price: "8 €" },
        { name: "Gin Tonic", desc: "Gin, citron, tonic", price: "10 €" },
        { name: "Gin Fizz", desc: "Gin, citron, citron vert, sucre de canne, eau gazeuse", price: "12 €" },
        { name: "Italicus Tonic", desc: "Italicus, gin, citron, tonic", price: "12 €" }
      ] }
    ],
    "Nos plats": [
      { title: "Nos viandes", note: "Servies avec frites maison ou légumes du moment, et salade.", items: [
        { name: "Entrecôte grillée", desc: "", price: "24 €" },
        { name: "Côtelettes d'agneau aux herbes", desc: "", price: "24 €" },
        { name: "Steak tartare", desc: "", price: "20 €" }
      ] },
      { title: "Nos poissons & pâtes", items: [
        { name: "Fish & Chips", desc: "Frites maison, salade verte et sauce tartare maison", price: "19 €" },
        { name: "Ravioles artisanales chèvre & figue", desc: "Crème de chèvre au miel infusée au romarin, brisures de noix torréfiées", price: "19 €" }
      ] },
      { title: "Nos salades", items: [
        { name: "Salade César", desc: "Iceberg, tomates cerises, oignons rouges, grana padano, tenders de poulet, croûtons, œuf dur, sauce césar maison", price: "17 €" },
        { name: "Salade de chèvre chaud", desc: "Mesclun, tomates cerises, oignons rouges, lardons grillés, toasts de cabécou, noix, vinaigrette maison", price: "17 €" }
      ] }
    ],
    "Menu enfant": [
      { title: "Menu enfant", price: "12,90 €", note: "Un plat, une boisson et un dessert.", items: [
        { name: "Cheeseburger", desc: "Servi avec des frites maison ou légumes du moment", price: "" },
        { name: "Tenders de poulet", desc: "Servi avec des frites maison ou légumes du moment", price: "" },
        { name: "Steak haché", desc: "Servi avec des frites maison ou légumes du moment", price: "" }
      ] },
      { title: "Boisson", items: [
        { name: "Sirop Monin", desc: "Fraise, grenadine, menthe, orgeat, pêche, pac citron, gambetta", price: "" }
      ] },
      { title: "Dessert", items: [
        { name: "Une boule de glace", desc: "Fraise, vanille, chocolat", price: "" }
      ] }
    ],
    "Pour (se) finir": [
      { title: "Nos desserts", items: [
        { name: "Assiette de fromages", desc: "", price: "4 €" },
        { name: "Tiramisu du moment", desc: "", price: "4 €" },
        { name: "Mousse au chocolat", desc: "", price: "3,50 €" },
        { name: "Tarte du moment", desc: "", price: "3 €" },
        { name: "Pana cotta", desc: "", price: "2,50 €" },
        { name: "Crème brûlée", desc: "", price: "à confirmer" }
      ] },
      { title: "Nos glaces", items: [
        { name: "Coco glacée", desc: "", price: "4,50 €" },
        { name: "Citron givré", desc: "", price: "4 €" },
        { name: "San Pellegrino 1 L", desc: "", price: "4 €" },
        { name: "Vittel 1 L", desc: "", price: "à confirmer" }
      ] },
      { title: "Digestifs & bière", note: "Café et boissons chaudes : tarifs à confirmer.", items: [
        { name: "Ricard, 51, Casanis", desc: "", price: "3 €" },
        { name: "Martini blanc ou rouge", desc: "", price: "3 €" },
        { name: "Apéritif + soda", desc: "", price: "4 €" },
        { name: "Rhum, whisky, vodka", desc: "", price: "4 €" },
        { name: "Vin au verre", desc: "Blanc, rouge, rosé", price: "4 €" },
        { name: "Pietra blonde pression", desc: "25 cl / 50 cl", price: "4 € / 8 €" },
        { name: "Pietra ambrée pression", desc: "25 cl / 50 cl", price: "4,50 € / 9 €" },
        { name: "Monaco", desc: "25 cl / 50 cl", price: "4,50 € / 9 €" },
        { name: "Pietra Chjuca", desc: "15 cl", price: "2,50 €" }
      ] }
    ],
    "Notre cave": [
      { title: "Vins rouges", note: "De 25 € à 39 € la bouteille · appellations et tarifs à confirmer.", items: [
        { name: "Cuvée Pommandre", desc: "AOP Côtes de Provence", price: "25 €" },
        { name: "Le « S »", desc: "AOP Ventoux", price: "à confirmer" },
        { name: "Enfant Terrible", desc: "IGP Méditerranée", price: "à confirmer" },
        { name: "Page Vignelaure", desc: "", price: "à confirmer" },
        { name: "Les Bories", desc: "", price: "à confirmer" }
      ] },
      { title: "Vins blancs", note: "Appellations et tarifs à confirmer.", items: [
        { name: "Cuvée Pommandre", desc: "AOP Côtes de Provence", price: "25 €" },
        { name: "Le « S »", desc: "AOP Ventoux", price: "à confirmer" },
        { name: "Enfant Terrible", desc: "IGP Méditerranée (2023)", price: "à confirmer" },
        { name: "Page Vignelaure", desc: "", price: "à confirmer" },
        { name: "Les Bories", desc: "", price: "à confirmer" }
      ] },
      { title: "Vins rosés", note: "Appellations et tarifs à confirmer.", items: [
        { name: "Cuvée Pommandre", desc: "AOP Côtes de Provence", price: "27 €" },
        { name: "Domaine des Masques, Essentielle", desc: "", price: "à confirmer" },
        { name: "Patrimonio Dos Teddi", desc: "", price: "à confirmer" },
        { name: "Roche Redonne", desc: "AOP Bandol (2023) · bio", price: "39 €" },
        { name: "Bargemone", desc: "AOP Côtes de Provence", price: "à confirmer" }
      ] }
    ]
  },
  "À emporter": {
    "Menus & suppléments": [
      { title: "Menu BB", note: "Burger + 3 € = menu frites classique + boisson. Burger + 5 € = menu frites du BB + boisson.", items: [
        { name: "Frites gorgonzola & noix", desc: "", price: "" },
        { name: "Frites Saint-Marcellin & lard grillé", desc: "", price: "" },
        { name: "Frites cheddar bacon", desc: "", price: "" }
      ] },
      { title: "Suppléments viandes", items: [
        { name: "Double steak ou double poulet", desc: "", price: "4 €" },
        { name: "Triple steak ou triple poulet", desc: "", price: "8 €" },
        { name: "Lard", desc: "", price: "1,50 €" },
        { name: "Bacon", desc: "", price: "1,50 €" }
      ] },
      { title: "Suppléments fromages", items: [
        { name: "Cheddar maturé, épicé ou poivré", desc: "", price: "1,50 €" },
        { name: "Chèvre", desc: "", price: "1,50 €" },
        { name: "Fourme d'Ambert", desc: "", price: "2 €" },
        { name: "Saint-Marcellin", desc: "", price: "3 €" },
        { name: "Bleu d'Auvergne pané maison", desc: "", price: "3,50 €" },
        { name: "Camembert pané maison", desc: "", price: "4 €" }
      ] },
      { title: "Légumes & sauces", items: [
        { name: "Légumes", desc: "Oignons rouges, oignons frits, compotée d'oignons maison, coleslaw maison, tomate, cornichon, roquette, iceberg, galette de pommes de terre", price: "1,50 €" },
        { name: "Sauces", desc: "Sauce de notre enfance, smashed sauce, tartare, moutarde miel, gorgonzola, mayo sriracha, Saint-Marcellin", price: "0,30 €" }
      ] }
    ],
    "Petites faims": [
      { title: "À partager", note: "Nos frites peuvent aussi être intégrées à un menu.", items: [
        { name: "Frites bleu d'Auvergne & noix", desc: "", price: "6 €" },
        { name: "Frites Saint-Marcellin & lard", desc: "", price: "6 €" },
        { name: "Frites cheddar bacon", desc: "", price: "6 €" }
      ] },
      { title: "Tapas", items: [
        { name: "Mini burger x4", desc: "", price: "10 €" },
        { name: "Panisse x6", desc: "", price: "6 €" },
        { name: "Tenders x4", desc: "", price: "6 €" },
        { name: "Camembert pané x4", desc: "", price: "6 €" },
        { name: "Saint-Marcellin pané x2", desc: "", price: "4 €" },
        { name: "Chilli cheese x6", desc: "", price: "6 €" },
        { name: "Stick de mozzarella x6", desc: "", price: "6 €" }
      ] },
      { title: "Menu étudiant", price: "11,90 €", note: "Sur présentation de la carte étudiante, un menu par carte.", items: [
        { name: "Burger Smash", desc: "", price: "" },
        { name: "Frites maison", desc: "", price: "" },
        { name: "Boisson 33 cl", desc: "", price: "" }
      ] }
    ],
    "Desserts & boissons": [
      { title: "Nos desserts", price: "6 €", note: "Tous nos desserts sont faits maison. Demandez les créations du moment, elles changent au fil des saisons.", items: [
        { name: "Tiramisu", desc: "", price: "" },
        { name: "Mousse au chocolat", desc: "", price: "" },
        { name: "Tarte du moment", desc: "", price: "" },
        { name: "Pana cotta", desc: "", price: "" },
        { name: "Brownie", desc: "", price: "" },
        { name: "Dessert du moment", desc: "", price: "" }
      ] },
      { title: "Nos boissons", price: "2 €", note: "Format 33 cl, sauf les bières servies en 25 cl.", items: [
        { name: "Coca-Cola, Coca Cherry, Coca Zéro", desc: "", price: "" },
        { name: "Oasis, Ice Tea, Orangina", desc: "", price: "" },
        { name: "Sprite, Perrier", desc: "", price: "" },
        { name: "Bière 25 cl", desc: "", price: "" }
      ] },
      { title: "Menu enfant", price: "11,90 €", note: "Au choix, servi avec frites maison ou légumes du moment, et une boisson 33 cl. Le mardi soir et le mercredi midi, le menu enfant est offert pour tout achat d'un menu adulte.", items: [
        { name: "Cheeseburger", desc: "", price: "" },
        { name: "Tenders de poulet", desc: "", price: "" },
        { name: "Steak haché", desc: "", price: "" }
      ] }
    ]
  }
};

const PLAT_DU_JOUR = {
  plat: {
    label: "Plat du jour",
    meta: "Jeudi 7 août · servi de 12h à 14h",
    title: "Brochette de magret de canard aux abricots marinée, boulgour aux légumes croquants",
    price: "14,50 €"
  },
  suggestion: {
    label: "Suggestion du jour",
    title: "Burger du boucher, sauce poivre",
    description: "La suggestion que le chef ajoute à la carte, selon le marché du matin. Servie avec frites maison et salade.",
    price: "16,90 €"
  }
};

const OFFRES = [
  { tag: "Menu étudiant", price: "11,90 €", title: "Burger smash, frites maison, boisson 33 cl", description: "Offre valable uniquement sur présentation de la carte étudiante, un menu par carte.", img: "assets/menu-etudiant.png" },
  { tag: "Menu enfant", price: "11,90 €", title: "Cheeseburger, tenders de poulet ou steak haché, boisson 33 cl", description: "Le mardi soir et le mercredi midi, le menu enfant est offert pour tout achat d'un menu adulte. Valable également pour tout repas sur place.", img: "assets/menu-enfant.png" },
  { tag: "Carte de fidélité", price: "", title: "Une case par tranche de 15 € d'achat", description: "Dix cases complétées, quinze euros offerts. Passez récupérer votre carte au comptoir. Offre non cumulable, carte nominative.", img: "assets/carte-fidelite.png" },
  { tag: "Carte cadeau", price: "", title: "Scannez le QR code en salle pour gagner des lots", description: "Tentez votre chance, gagnez, et venez récupérer vos cadeaux sur place.", img: "assets/carte-cadeau.png" }
];

const RESERVATION_SETTINGS = {
  heures: ["12h00", "12h30", "13h00", "13h30", "14h00", "19h00", "19h30", "20h00", "20h30", "21h00"],
  couverts: ["2 personnes", "3 personnes", "4 personnes", "5 personnes", "6 personnes et plus"],
  horaires_text: [
    "Du lundi au vendredi · midi et soir",
    "Samedi · soir uniquement",
    "Fermé samedi midi et dimanche toute la journée",
    "Parking gratuit devant le restaurant"
  ]
};

module.exports = async (req, res) => {
  if (req.query.token !== SEED_TOKEN) {
    res.status(403).json({ error: "Jeton invalide." });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Variables d'environnement Supabase manquantes." });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const rows = [
    { key: "burgers", value: BURGERS },
    { key: "cartes", value: CARTES },
    { key: "plat_du_jour", value: PLAT_DU_JOUR },
    { key: "offres", value: OFFRES },
    { key: "reservation_settings", value: RESERVATION_SETTINGS },
  ];

  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ ok: true, seeded: rows.map((r) => r.key) });
};
