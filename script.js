"use strict";
(() => {
  /* ---------------------------------------------------------------- */
  /* Data (verbatim from the source design's data-dc-script block)     */
  /* ---------------------------------------------------------------- */
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

  const GRADS = ["ph-1", "ph-2", "ph-3"];

  const REVIEWS = [
    { initials: "EC", name: "Eleonore C.", meta: "Avis Google · 5/5", text: "Tout était nickel. Service agréable et serviable, nourriture super, prix corrects et une déco douce." },
    { initials: "AB", name: "Arno BRS", meta: "Avis Google · 5/5", text: "En passant par là, un arrêt déjeuner et une belle surprise : cuisine très bonne et copieuse, service rapide et souriant." },
    { initials: "YG", name: "Yannick Gonzalez", meta: "Avis Google · 5/5", text: "Une équipe super agréable, on mange super bien, les burgers sont top. On y passe un bon moment en famille ou entre amis." },
    { initials: "JK", name: "Les jardins de Kerellec", meta: "Avis Google · 5/5", text: "Accueil au top, cuisine maîtrisée et avec du goût au rendez-vous. Nous recommandons vivement." },
    { initials: "CO", name: "Corinne", meta: "Avis Google · 5/5", text: "Une belle décoration, un accueil chaleureux et un service de qualité. Les burgers sont vraiment excellents." },
    { initials: "SG", name: "Sandrine G.", meta: "Avis Google · 5/5", text: "Plat du jour et burger, tout était excellent : cuisiné avec des produits frais, et ça se sent. Le personnel est souriant." }
  ];

  const FAQ = [
    { q: "Proposez-vous des options végétariennes ?", a: "Oui. Le Jardinier est disponible toute l'année, et un burger végétarien du moment change chaque mois. Nos frites sont cuites dans un bain séparé." },
    { q: "Comment sont gérés les allergènes ?", a: "La liste complète des allergènes de chaque plat est disponible en salle et sur demande au comptoir. Signalez toute allergie au moment de la commande : la cuisine adapte la préparation quand c'est possible." },
    { q: "Quels sont vos horaires ?", a: "Du lundi au vendredi, midi et soir. Le samedi, le soir uniquement. Nous sommes fermés le samedi midi et le dimanche toute la journée." },
    { q: "Faut-il réserver ?", a: "Ce n'est pas obligatoire, mais c'est plus sûr le vendredi et le samedi soir. Pour les groupes de plus de dix personnes, appelez-nous au 04 65 84 89 18." },
    { q: "Livrez-vous à domicile ?", a: "Oui, sur Gardanne et les communes limitrophes. Zone et délais à confirmer avec la plateforme de commande." },
    { q: "Y a-t-il un parking ?", a: "Un parking gratuit se trouve directement devant le restaurant, dans la ZAC Avon. Aucun horodateur, aucune limite de durée." }
  ];

  const POSTS = [
    { slug: "la-terrasse-est-ouverte-tout-lete", img: "assets/blog-terrasse.png", date: "Bistro Burger · 2 août 2026", title: "La terrasse est ouverte tout l'été", excerpt: "Douze couverts supplémentaires à l'ombre, dès 19h et jusqu'à la fermeture.", body: "La terrasse est installée pour toute la saison, côté ombre, à l'écart du passage. Douze couverts de plus chaque soir, ouverts dès 19h et jusqu'à la fermeture. Sur les créneaux du vendredi et du samedi elle part vite : réservez si vous y tenez, en précisant votre préférence au moment de la demande." },
    { slug: "un-nouveau-pain-livre-chaque-matin", img: "assets/blog-pain.png", date: "Bistro Burger · 24 juillet 2026", title: "Un nouveau pain, livré chaque matin", excerpt: "Nous travaillons désormais avec une boulangerie de Gardanne pour tous nos buns.", body: "Nos buns sont désormais façonnés par une boulangerie de Gardanne et livrés chaque matin. Le pain tient mieux à la cuisson, la mie reste moelleuse jusqu'à la dernière bouchée, et le circuit se raccourcit à quelques rues. Le changement concerne toute la carte, sur place comme à emporter." },
    { slug: "le-plat-du-jour-sur-instagram", img: "assets/blog-instagram.png", date: "Bistro Burger · 10 juillet 2026", title: "Le plat du jour, maintenant sur Instagram", excerpt: "Retrouvez chaque matin l'ardoise du jour sur @bistroburger_gardanne.", body: "Chaque matin, l'ardoise du jour est publiée sur notre compte Instagram avant le service de midi. Plat, accompagnement et prix : de quoi décider avant de sortir du bureau. Suivez @bistroburger_gardanne pour la recevoir dans votre fil." }
  ];

  /* ---------------------------------------------------------------- */
  /* State                                                             */
  /* ---------------------------------------------------------------- */
  const state = { mode: "Sur place", tab: "Apéro", reviewPage: 0, faqOpen: 0, postOpen: -1 };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = (tag, attrs, html) => {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "style") n.style.cssText = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (html !== undefined) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------------------------------------------------------- */
  /* Smooth-scroll to a section (accounts for the fixed header)        */
  /* ---------------------------------------------------------------- */
  function jump(id) {
    const target = document.getElementById(id);
    if (!target) {
      const home = document.body.getAttribute("data-home") || "index.html";
      window.location.href = home + "#" + id;
      return;
    }
    const header = document.querySelector("header");
    const offset = (header ? header.offsetHeight : 70) + 4;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
  }
  document.addEventListener("click", (e) => {
    const goEl = e.target.closest("[data-go]");
    if (goEl) { jump(goEl.getAttribute("data-go")); return; }
  });

  /* ---------------------------------------------------------------- */
  /* Header spacer sync (keeps content clear of the fixed header)      */
  /* ---------------------------------------------------------------- */
  function syncSpacer() {
    const header = document.querySelector("header");
    const spacer = document.getElementById("header-spacer");
    if (header && spacer && state_navOpen() !== true) spacer.style.height = header.offsetHeight + "px";
  }
  function state_navOpen() { return document.getElementById("nav-main").getAttribute("data-open") === "true"; }
  syncSpacer();
  setInterval(syncSpacer, 500);
  window.addEventListener("resize", syncSpacer);

  /* ---------------------------------------------------------------- */
  /* Mobile nav / carte dropdown                                       */
  /* ---------------------------------------------------------------- */
  const navToggle = document.getElementById("nav-toggle");
  const navMain = document.getElementById("nav-main");
  const navActions = document.getElementById("nav-actions");
  const cartToggle = document.getElementById("cart-toggle");
  const navPanel = document.getElementById("nav-panel");
  const navDrop = document.getElementById("nav-drop");

  function setMenuOpen(open) {
    navMain.setAttribute("data-open", open ? "true" : "false");
    navActions.setAttribute("data-open", open ? "true" : "false");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  navToggle.addEventListener("click", () => setMenuOpen(navMain.getAttribute("data-open") !== "true"));
  navMain.addEventListener("click", (e) => {
    if (e.target.closest("a") && !e.target.closest("[data-nav-item]")) setMenuOpen(false);
  });
  cartToggle.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    const open = navPanel.getAttribute("data-open") === "true";
    navPanel.setAttribute("data-open", open ? "false" : "true");
    navDrop.setAttribute("data-open", open ? "false" : "true");
  });
  document.addEventListener("click", (e) => {
    if (!navDrop.contains(e.target)) { navPanel.setAttribute("data-open", "false"); navDrop.setAttribute("data-open", "false"); }
  });
  $$("[data-nav-item][data-go-carte]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-go-carte");
      if (document.getElementById("mode-toggle")) {
        state.mode = mode;
        state.tab = Object.keys(CARTES[mode])[0];
        renderCarte();
      }
      setMenuOpen(false);
      navPanel.setAttribute("data-open", "false"); navDrop.setAttribute("data-open", "false");
      jump("carte");
    });
  });
  $$("[data-nav-item][href='#burgers']").forEach((a) => a.addEventListener("click", () => setMenuOpen(false)));
  document.querySelector("[data-call]").addEventListener("click", () => { window.location.href = "tel:+33465848918"; });

  /* ---------------------------------------------------------------- */
  /* Marquee ticker (top strip)                                        */
  /* ---------------------------------------------------------------- */
  (function renderMarquee() {
    const track = document.getElementById("marquee-track");
    if (!track) return;
    const items = [
      "Livraison à Gardanne et communes voisines",
      "Plat du jour du lundi au vendredi, 12h–14h",
      "Burgers faits maison · produits frais"
    ];
    const span = (text) => `<span style="font-family:var(--font-heading); font-weight:700; font-size:13px; letter-spacing:.16em; text-transform:uppercase; white-space:nowrap;">${esc(text)}</span><span style="color:var(--cream-500); font-size:15px; line-height:1;">✳</span>`;
    let html = "";
    for (let i = 0; i < 8; i++) html += span(items[i % items.length]);
    track.innerHTML = html;
  })();

  /* ---------------------------------------------------------------- */
  /* Burgers carousel                                                   */
  /* ---------------------------------------------------------------- */
  function renderBurgers() {
    const track = document.getElementById("burger-track");
    if (!track) return;
    const flat = BURGERS.flatMap((fam) => fam.items.map((b) => ({ ...b, noImg: !b.img })));
    flat.sort((a, b) => (a.img ? 0 : 1) - (b.img ? 0 : 1));
    track.innerHTML = "";
    flat.forEach((b) => {
      const card = el("div", { "data-burger-card": "", style: "display:flex; flex-direction:column; gap:11px; padding:18px; border-radius:var(--radius-card); background:#FFFFFF; border:1px solid var(--border-default); box-shadow:0 10px 26px rgba(44,44,42,.1);" });
      const photo = el("div", { "data-b-photo": "", style: "position:relative; aspect-ratio:4/3; border-radius:var(--radius-photo); background:linear-gradient(150deg,#FFFFFF,var(--cream-400)); box-shadow:0 8px 20px rgba(44,44,42,.14); display:flex; align-items:center; justify-content:center; font-family:var(--font-heading); font-weight:600; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:rgba(18,87,76,.45); overflow:hidden;" });
      if (b.img) {
        photo.innerHTML = `<img src="${esc(b.img)}" alt="${esc(b.name)}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">`;
      } else {
        photo.innerHTML = "<span>Photo</span>";
      }
      const tags = el("div", { style: "position:absolute; z-index:2; top:12px; left:12px; right:12px; display:flex; flex-wrap:wrap; gap:7px;" },
        `<span data-b-price style="font-family:var(--font-heading); font-weight:700; font-size:14px; color:var(--color-secondary); background:linear-gradient(115deg,#2E8F7C 0%,var(--green-700) 40%,var(--color-primary) 100%); box-shadow:inset 0 1px 0 rgba(237,224,211,.28), 0 5px 14px rgba(14,70,61,.26); padding:6px 13px; border-radius:var(--radius-badge);">${esc(b.sur)} sur place</span>
         <span data-b-price2 style="font-family:var(--font-heading); font-weight:700; font-size:14px; color:var(--color-primary); background:linear-gradient(115deg,#FFFBF6 0%,var(--cream-500) 45%,#D9C7B3 100%); box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 5px 14px rgba(14,70,61,.2); padding:6px 13px; border-radius:var(--radius-badge);">${esc(b.emp)} à emporter</span>`);
      photo.appendChild(tags);
      card.appendChild(photo);
      card.appendChild(el("span", { "data-b-name": "", style: "align-self:flex-start; font-family:var(--font-heading); font-weight:700; font-size:17px; line-height:1.2; color:var(--color-secondary); background:linear-gradient(115deg,#2E8F7C 0%,var(--green-700) 40%,var(--color-primary) 100%); box-shadow:inset 0 1px 0 rgba(237,224,211,.28), 0 5px 14px rgba(14,70,61,.2); padding:7px 15px; border-radius:var(--radius-badge);" }, esc(b.name)));
      card.appendChild(el("p", { "data-b-desc": "", style: "font-size:13.5px; line-height:1.55; color:var(--text-muted); margin:0; flex:1;" }, esc(b.desc)));
      const actions = el("div", { style: "display:flex; flex-wrap:wrap; gap:9px;" });
      const orderBtn = el("button", { type: "button", "data-shine": "", "data-b-order": "", "data-go": "commander", style: "font-family:var(--font-heading); font-weight:600; font-size:13px; padding:10px 18px; border:none; cursor:pointer; border-radius:var(--radius-badge); color:var(--color-secondary); background:linear-gradient(115deg,#2E8F7C 0%,var(--green-700) 30%,var(--color-primary) 62%,var(--green-900) 100%); box-shadow:inset 0 1px 0 rgba(237,224,211,.3), 0 6px 16px rgba(18,87,76,.26);" }, "Commander");
      const reserveBtn = el("button", { type: "button", "data-b-reserve": "", "data-go": "reservation", style: "font-family:var(--font-heading); font-weight:600; font-size:13px; padding:10px 18px; cursor:pointer; border-radius:var(--radius-badge); color:var(--color-primary); background:transparent; border:1.5px solid rgba(18,87,76,.45);" }, "Réserver");
      actions.appendChild(orderBtn); actions.appendChild(reserveBtn);
      card.appendChild(actions);
      track.appendChild(card);
    });
  }
  renderBurgers();

  (function burgerCarousel() {
    const track = document.getElementById("burger-track");
    if (!track) return;
    function scrollBurgers(dir) {
      const card = track.querySelector("[data-burger-card]");
      const step = card ? card.getBoundingClientRect().width + 22 : track.clientWidth * 0.8;
      const max = track.scrollWidth - track.clientWidth;
      const from = track.scrollLeft;
      const to = Math.max(0, Math.min(max, from + dir * step));
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 380);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        track.scrollLeft = from + (to - from) * e;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    $$("[data-burger-arrow]").forEach((btn) => {
      btn.addEventListener("click", () => scrollBurgers(btn.getAttribute("data-dir") === "prev" ? -1 : 1));
    });
  })();

  /* ---------------------------------------------------------------- */
  /* Notre carte: mode toggle, tabs, groups                            */
  /* ---------------------------------------------------------------- */
  function renderCarte() {
    const modeToggle = document.getElementById("mode-toggle");
    if (!modeToggle) return;
    const carte = CARTES[state.mode];
    const tabItems = Object.keys(carte);
    if (!carte[state.tab]) state.tab = tabItems[0];

    modeToggle.innerHTML = "";
    Object.keys(CARTES).forEach((m) => {
      const on = m === state.mode;
      const btn = el("button", { type: "button", style: "font-family:var(--font-heading); font-weight:600; font-size:14px; padding:11px 22px; border:none; cursor:pointer; white-space:nowrap; border-radius:var(--radius-badge); transition:all .15s ease; " + (on
        ? "background:linear-gradient(115deg,#2E8F7C 0%,var(--green-700) 30%,var(--color-primary) 62%,var(--green-900) 100%); color:var(--color-secondary); box-shadow:inset 0 1px 0 rgba(237,224,211,.3), inset 0 -1px 0 rgba(14,70,61,.5), 0 6px 18px rgba(18,87,76,.28);"
        : "background:transparent; color:var(--text-muted);") }, m === "Sur place" ? "Carte sur place" : "Carte à emporter");
      btn.addEventListener("click", () => { state.mode = m; state.tab = Object.keys(CARTES[m])[0]; renderCarte(); });
      modeToggle.appendChild(btn);
    });

    const tabsList = document.getElementById("tabs-list");
    tabsList.innerHTML = "";
    tabItems.forEach((t) => {
      const tab = el("button", { type: "button", class: "tab" + (t === state.tab ? " active" : "") }, esc(t));
      tab.addEventListener("click", () => { state.tab = t; renderCarte(); });
      tabsList.appendChild(tab);
    });

    const groups = carte[state.tab];
    const groupsEl = document.getElementById("carte-groups");
    groupsEl.innerHTML = "";
    groups.forEach((group) => {
      const wrap = el("div", {});
      const head = el("div", { style: "display:flex; align-items:center; gap:18px; flex-wrap:wrap;" });
      head.appendChild(el("h3", { style: "font-family:var(--font-heading); font-weight:700; font-size:12.5px; letter-spacing:.16em; text-transform:uppercase; margin:0; color:var(--color-primary); background:linear-gradient(115deg,#FFFBF6 0%,var(--cream-500) 45%,#D9C7B3 100%); box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 6px 18px rgba(14,70,61,.3); padding:9px 20px; border-radius:var(--radius-badge);" }, esc(group.title)));
      head.appendChild(el("div", { style: "flex:1; height:1px; background:linear-gradient(90deg,rgba(237,224,211,.45),transparent); min-width:40px;" }));
      if (group.price) head.appendChild(el("span", { style: "font-family:var(--font-heading); font-weight:700; font-size:17px; color:var(--color-primary); background:linear-gradient(115deg,#FFFBF6 0%,var(--cream-500) 45%,#D9C7B3 100%); padding:8px 18px; border-radius:var(--radius-badge);" }, esc(group.price)));
      wrap.appendChild(head);
      if (group.note) wrap.appendChild(el("p", { style: "font-size:13.5px; line-height:1.6; color:rgba(237,224,211,.8); margin:16px 0 0; max-width:640px;" }, esc(group.note)));
      const grid = el("div", { style: "display:grid; grid-template-columns:1fr 1fr; gap:14px 24px; margin-top:24px;" });
      group.items.forEach((item) => {
        const row = el("div", { style: "position:relative; border-radius:var(--radius-photo); padding:20px 22px; background:var(--surface-alt); border:1px solid transparent; box-shadow:0 4px 14px rgba(44,44,42,.08);" });
        const line = el("div", { style: "display:flex; align-items:baseline; gap:12px;" });
        line.appendChild(el("span", { style: "font-family:var(--font-heading); font-weight:700; font-size:17.5px; line-height:1.25; letter-spacing:.01em; text-transform:uppercase; color:var(--color-primary);" }, esc(item.name)));
        line.appendChild(el("span", { style: "flex:1; min-width:16px; border-bottom:2px dotted var(--border-default); transform:translateY(-4px);" }));
        if (item.price) line.appendChild(el("span", { style: "font-family:var(--font-heading); font-weight:700; font-size:15px; color:var(--color-accent); background:rgba(181,101,29,.1); padding:5px 13px; border-radius:var(--radius-badge); white-space:nowrap;" }, esc(item.price)));
        row.appendChild(line);
        row.appendChild(el("div", { style: "font-size:14px; line-height:1.55; color:var(--text-muted); margin-top:9px; min-height:22px;" }, esc(item.desc || "")));
        grid.appendChild(row);
      });
      wrap.appendChild(grid);
      groupsEl.appendChild(wrap);
    });
  }
  renderCarte();

  /* ---------------------------------------------------------------- */
  /* Avis clients (paginated reviews)                                   */
  /* ---------------------------------------------------------------- */
  function renderReviews() {
    const grid = document.getElementById("reviews-grid");
    if (!grid) return;
    const pages = Math.ceil(REVIEWS.length / 2);
    state.reviewPage = ((state.reviewPage % pages) + pages) % pages;
    const slice = REVIEWS.slice(state.reviewPage * 2, state.reviewPage * 2 + 2);
    grid.innerHTML = "";
    slice.forEach((r) => {
      const card = el("div", { class: "card card-padded", style: "background:#FFFFFF; padding:30px;" });
      const head = el("div", { style: "display:flex; align-items:center; gap:14px;" });
      head.appendChild(el("div", { style: "width:46px; height:46px; border-radius:50%; background:linear-gradient(115deg,#2E8F7C 0%,var(--green-700) 30%,var(--color-primary) 62%,var(--green-900) 100%); box-shadow:inset 0 1px 0 rgba(237,224,211,.3), inset 0 -1px 0 rgba(14,70,61,.5), 0 6px 18px rgba(18,87,76,.28); display:flex; align-items:center; justify-content:center; color:var(--color-secondary); font-family:var(--font-heading); font-weight:700; font-size:15px;" }, esc(r.initials)));
      head.appendChild(el("div", {}, `<div style="font-family:var(--font-heading); font-weight:600; font-size:15.5px; color:var(--text-body);">${esc(r.name)}</div><div style="font-size:12.5px; color:var(--text-muted);">${esc(r.meta)}</div>`));
      head.appendChild(el("div", { style: "margin-left:auto; color:var(--color-primary); font-size:15px; letter-spacing:2px;" }, "★★★★★"));
      card.appendChild(head);
      card.appendChild(el("p", { style: "font-size:15px; line-height:1.7; color:var(--text-muted); margin:18px 0 0;" }, esc(r.text)));
      grid.appendChild(card);
    });
    const dots = document.getElementById("reviews-dots");
    dots.innerHTML = "";
    for (let i = 0; i < pages; i++) {
      const on = i === state.reviewPage;
      const dot = el("button", { type: "button", style: "width:" + (on ? "28px" : "9px") + "; height:9px; border-radius:var(--radius-badge); border:none; cursor:pointer; padding:0; transition:all .2s ease; background:" + (on ? "linear-gradient(115deg,#2E8F7C,var(--color-primary))" : "#C9B6A2") });
      dot.addEventListener("click", () => { state.reviewPage = i; renderReviews(); });
      dots.appendChild(dot);
    }
  }
  renderReviews();

  /* ---------------------------------------------------------------- */
  /* FAQ accordion                                                      */
  /* ---------------------------------------------------------------- */
  function renderFaq() {
    const list = document.getElementById("faq-list");
    if (!list) return;
    list.innerHTML = "";
    FAQ.forEach((f, i) => {
      const open = state.faqOpen === i;
      const card = el("div", { class: "card", style: "background:#FFFFFF; overflow:hidden;" });
      const btn = el("button", { type: "button", style: "width:100%; display:flex; align-items:center; justify-content:space-between; gap:16px; background:transparent; border:none; padding:20px 24px; cursor:pointer; text-align:left; font-family:var(--font-heading); font-weight:600; font-size:16.5px; color:var(--color-primary);" },
        `<span>${esc(f.q)}</span><span style="font-family:var(--font-heading); font-weight:600; font-size:22px; line-height:1; color:var(--green-700); transition:transform .2s ease; transform:rotate(${open ? "45deg" : "0deg"})">+</span>`);
      btn.addEventListener("click", () => { state.faqOpen = open ? -1 : i; renderFaq(); });
      card.appendChild(btn);
      if (open) card.appendChild(el("div", { style: "padding:0 24px 22px; font-size:15px; line-height:1.7; color:var(--text-muted);" }, esc(f.a)));
      list.appendChild(card);
    });
  }
  renderFaq();

  /* ---------------------------------------------------------------- */
  /* Blog                                                               */
  /* ---------------------------------------------------------------- */
  function renderBlog() {
    const grid = document.getElementById("blog-grid");
    if (!grid) return;
    const blogBaseAttr = document.body.getAttribute("data-blog-base");
    const blogBase = blogBaseAttr !== null ? blogBaseAttr : "blog/";
    const assetBaseAttr = document.body.getAttribute("data-asset-base");
    const assetBase = assetBaseAttr !== null ? assetBaseAttr : "";
    grid.innerHTML = "";
    POSTS.forEach((post, i) => {
      const card = el("a", { class: "card blog-card", href: blogBase + post.slug + ".html", style: "background:#FFFFFF; overflow:hidden;" });
      if (post.img) {
        card.appendChild(el("div", { style: "aspect-ratio:16/10; overflow:hidden;" }, `<img src="${esc(assetBase + post.img)}" alt="${esc(post.title)}" style="width:100%; height:100%; object-fit:cover; display:block;">`));
      } else {
        card.appendChild(el("div", { class: "ph " + GRADS[i % 3], style: "aspect-ratio:16/10;" }, "Photo — " + esc(post.title)));
      }
      const body = el("div", { style: "padding:24px;" });
      body.appendChild(el("div", { style: "font-size:12.5px; color:var(--text-muted);" }, esc(post.date)));
      body.appendChild(el("h3", { style: "font-family:var(--font-heading); font-weight:600; font-size:19px; margin:8px 0 0; color:var(--text-body);" }, esc(post.title)));
      body.appendChild(el("p", { style: "font-size:14px; line-height:1.6; color:var(--text-muted); margin:10px 0 0;" }, esc(post.excerpt)));
      body.appendChild(el("span", { style: "display:inline-block; margin-top:14px; font-family:var(--font-heading); font-weight:600; font-size:13.5px; color:var(--color-primary);" }, "Lire la suite →"));
      card.appendChild(body);
      grid.appendChild(card);
    });
  }
  renderBlog();

  /* ---------------------------------------------------------------- */
  /* Band of photos (bottom marquee) — bande-5/6 use placeholders       */
  /* ---------------------------------------------------------------- */
  (function renderBand() {
    if (!document.getElementById("band-track")) return;
    const sequence = [
      { img: "assets/bande-5.png", alt: "Cheeseburger et frites maison servis sur assiette" },
      { img: "assets/bande-1.webp", alt: "Bowl de poulet grillé, poivrons confits et riz" },
      { img: "assets/bande-6.png", alt: "Poulet mariné en pain pita avec frites maison" },
      { img: "assets/bande-2.webp", alt: "Penne à la crème de champignons et roquette" },
      { img: "assets/bande-4.webp", alt: "Entrecôte, gratin de pommes de terre et salade" },
      { img: "assets/bande-3.webp", alt: "Café, jus d'orange et viennoiserie en salle le matin" }
    ];
    const track = document.getElementById("band-track");
    function group(hidden) {
      const wrap = el("div", { style: "display:flex; gap:16px; padding:0 8px;" + (hidden ? "" : "") });
      if (hidden) wrap.setAttribute("aria-hidden", "true");
      sequence.forEach((item) => {
        const card = el("div", { "data-band-card": "", style: "padding:9px; border-radius:18px; background:linear-gradient(135deg,#3AA48E,var(--green-700) 55%,var(--green-900)); box-shadow:0 12px 30px rgba(14,70,61,.3);" });
        const box = el("div", { style: "height:170px; border-radius:12px; overflow:hidden;" });
        if (item.img) box.innerHTML = `<img src="${esc(item.img)}" alt="${esc(item.alt)}" style="width:100%; height:100%; object-fit:cover; display:block;">`;
        else box.innerHTML = `<div class="ph ${item.ph}" style="width:100%; height:100%;">${esc(item.label)}</div>`;
        card.appendChild(box);
        wrap.appendChild(card);
      });
      return wrap;
    }
    track.appendChild(group(false));
    const dup = group(true);
    dup.style.width = "50%";
    track.appendChild(dup);
  })();

  /* ---------------------------------------------------------------- */
  /* Reveal-on-scroll                                                   */
  /* ---------------------------------------------------------------- */
  if (!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll("[data-reveal]").forEach((elm) => io.observe(elm));
  } else {
    document.querySelectorAll("[data-reveal]").forEach((elm) => elm.classList.add("in"));
  }

  /* ---------------------------------------------------------------- */
  /* Reservation & newsletter forms (static site — no backend)         */
  /* ---------------------------------------------------------------- */
  (function reservationSubmit() {
    const form = document.getElementById("reservation-form");
    if (!form) return;
    const sentBox = document.getElementById("reservation-sent");
    const errorBox = document.getElementById("reservation-error");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      sentBox.hidden = true;
      errorBox.hidden = true;
      const submitBtn = form.querySelector("button[type=submit]");
      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi en cours…";
      try {
        const data = new FormData(form);
        const res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent("louangeprecieux0@gmail.com"), {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload || payload.success === "false" || payload.success === false) {
          throw new Error((payload && payload.message) || "request failed");
        }
        sentBox.hidden = false;
        form.reset();
      } catch (err) {
        errorBox.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  })();
  if (document.getElementById("newsletter-form")) {
    document.getElementById("newsletter-form").addEventListener("submit", (e) => {
      e.preventDefault();
      document.getElementById("newsletter-sent").hidden = false;
    });
  }

  /* ---------------------------------------------------------------- */
  /* Promo popup                                                        */
  /* ---------------------------------------------------------------- */
  const promoBackdrop = document.getElementById("promo-backdrop");
  if (promoBackdrop) {
    function openPromo() { promoBackdrop.hidden = false; document.getElementById("promo-box").style.animation = "bbPromoIn .55s cubic-bezier(.22,.9,.3,1) both"; }
    function closePromo() { promoBackdrop.hidden = true; }
    setTimeout(openPromo, 5500);
    setInterval(() => { if (promoBackdrop.hidden) openPromo(); }, 180000);
    document.getElementById("promo-close").addEventListener("click", closePromo);
    promoBackdrop.addEventListener("click", (e) => { if (e.target === promoBackdrop) closePromo(); });
    document.getElementById("promo-reserve").addEventListener("click", () => { closePromo(); jump("reservation"); });
  }
})();
