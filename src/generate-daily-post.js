const { checkDuplicate } = require("./check-duplicates");
const { checkTone } = require("./check-tone");
const {
  readJson,
  savePost,
  formatDate,
  parseDateArg,
  ensureProjectDirs,
  normalizeText
} = require("./utils");

const WEEKDAY_CONTENT = [
  { category: "Community", theme: "Geurkeuze op gevoel" },
  { category: "Geur van de week", theme: "Een rustige signatuur voor elke dag" },
  { category: "Geuradvies", theme: "Geurfamilies eenvoudig uitgelegd" },
  { category: "Partner Program", theme: "Delen wat bij je past" },
  { category: "Cadeau-inspiratie", theme: "Een verzorgd geurcadeau" },
  { category: "Bestseller", theme: "Populaire keuze uit de collectie" },
  { category: "Lifestyle", theme: "Een korte geur-routine" }
];

const CATEGORY_COPY = {
  "Geur van de week": {
    hook: "Een geur die rustig aanwezig is.",
    caption: "Deze week draait om een luxe geurbeleving met een helder profiel en een verzorgde uitstraling. Voor wie dagelijks iets eigens wil dragen.",
    cta: "Ontdek de collectie",
    visual: "premium parfumflacon op zachte creme stof, warm goud licht, luxe rustige productfotografie"
  },
  Geuradvies: {
    hook: "Zo kies je een geurprofiel dat bij je past.",
    caption: "Fris voelt licht en energiek. Bloemig is zacht en elegant. Houtachtig geeft meer diepte. ORIVÈA helpt kiezen op basis van gevoel, moment en stijl.",
    cta: "Vraag geuradvies",
    visual: "minimalistische geurkaart met parfumflacon, creme achtergrond, subtiele gouden details"
  },
  "Partner Program": {
    hook: "Deel jouw favoriete geuren op jouw tempo.",
    caption: "Het Glantier Partner Program is er voor volwassenen die hun passie voor luxe geuren willen delen. Resultaten hangen af van eigen inzet, netwerk en verkoopactiviteiten. #ad",
    cta: "Bekijk het partnerprogramma",
    visual: "premium werkplek met parfum samples, notebook, zachte beige tinten, professionele sfeer"
  },
  "Cadeau-inspiratie": {
    hook: "Een geurcadeau voelt persoonlijk.",
    caption: "Kies voor een zorgvuldig geselecteerde geur, een discovery sample of een verzorgde giftset. Zo geef je iets dat stijlvol, bruikbaar en persoonlijk aanvoelt.",
    cta: "Bekijk cadeau-inspiratie",
    visual: "luxe cadeauverpakking met parfum, lint, creme en goud, rustige premium compositie"
  },
  Bestseller: {
    hook: "Een populaire keuze begint bij herkenbare stijl.",
    caption: "Onze bestsellers combineren een duidelijke geurbeleving met een luxe presentatie. Ideaal wanneer je een geur zoekt die direct vertrouwen geeft.",
    cta: "Bekijk populaire geuren",
    visual: "bestseller parfumcollectie op marmer, warme verlichting, premium webshop fotografie"
  },
  Lifestyle: {
    hook: "Een geur maakt je routine af.",
    caption: "Een paar momenten aandacht zijn genoeg: kies je geur, spray subtiel en neem je eigen signatuur mee door de dag. Rustig, verzorgd en herkenbaar.",
    cta: "Vind jouw geur",
    visual: "ochtendroutine met parfum op wastafel, zachte handdoek, natuurlijk licht, luxe kalme sfeer"
  },
  Community: {
    hook: "Welke geur past bij jouw dag?",
    caption: "Vandaag draait het om kiezen op gevoel. Fris en licht, warm en elegant of zacht bloemig? Reageer met jouw favoriete geurprofiel.",
    cta: "Deel jouw voorkeur",
    visual: "drie geurprofielen als elegante productflatlay, creme achtergrond, subtiele gouden accenten"
  }
};

const HASHTAG_SETS = {
  base: ["#orivea", "#luxegeuren", "#geurbeleving", "#geurprofiel", "#parfumroutine", "#persoonlijkadvies", "#discoverysample", "#luxecollectie"],
  gift: ["#cadeautip", "#geurcadeau", "#giftset", "#cadeauinspiratie", "#verzorgdcadeau"],
  partner: ["#partnerprogramma", "#ondernemen", "#samenwerking", "#ad"],
  lifestyle: ["#lifestyle", "#stijlvol", "#dagelijksmoment", "#eigenstijl"]
};

function findSeasonalEvent(dateString) {
  return readJson("config/seasonalEvents.json", []).find((event) => event.date === dateString);
}

function getDayDefinition(date, dateString) {
  const event = findSeasonalEvent(dateString);
  if (event) return { category: "Seizoensmoment", theme: event.name };
  return WEEKDAY_CONTENT[date.getUTCDay()];
}

function buildHashtags(category, dateString) {
  const dayNumber = Number(dateString.replaceAll("-", ""));
  let tags = [...HASHTAG_SETS.base];
  if (category.includes("Cadeau") || category === "Seizoensmoment") tags = tags.concat(HASHTAG_SETS.gift);
  if (category === "Partner Program") tags = tags.concat(HASHTAG_SETS.partner);
  if (category === "Lifestyle") tags = tags.concat(HASHTAG_SETS.lifestyle);
  const shift = dayNumber % tags.length;
  return Array.from(new Set(tags.slice(shift).concat(tags.slice(0, shift)))).slice(0, 12);
}

function collectPostText(post) {
  return [
    post.theme,
    post.instagram.caption,
    post.instagram.shortCaption,
    post.facebook.caption,
    post.tiktok.hook,
    post.tiktok.caption,
    post.tiktok.script,
    post.callToAction
  ].join(" ");
}

function checkCompliance(post, config, forbidden) {
  const normalized = normalizeText(collectPostText(post));
  const hit = forbidden.find((phrase) => normalized.includes(normalizeText(phrase)));
  if (hit) return { passed: false, reason: `Verboden term gebruikt: ${hit}` };
  if (config.requireAdDisclosure && post.category === "Partner Program") {
    const raw = collectPostText(post).toLowerCase();
    if (!raw.includes("#ad") && !raw.includes("#samenwerking")) {
      return { passed: false, reason: "Partnerpost mist #ad of #samenwerking." };
    }
  }
  return { passed: true, reason: "" };
}

function buildPost(date) {
  const config = readJson("config/social-agent-config.json");
  const forbidden = readJson("config/forbiddenPhrases.json", { forbiddenPhrases: [] }).forbiddenPhrases;
  const dateString = formatDate(date);
  const day = getDayDefinition(date, dateString);
  const copy = CATEGORY_COPY[day.category] || {
    hook: `${day.theme} bij ORIVÈA.`,
    caption: "Een zorgvuldig gekozen moment uit de ORIVÈA collectie, afgestemd op seizoen, stijl en persoonlijke geurbeleving.",
    cta: "Bekijk de collectie",
    visual: "luxe parfumproduct in creme en goud, rustige premium compositie"
  };
  const hashtags = buildHashtags(day.category, dateString);

  const post = {
    id: `${dateString}-orivea-social`,
    date: dateString,
    category: day.category,
    theme: day.theme,
    instagram: {
      caption: `${copy.caption}\n\n${hashtags.join(" ")}`,
      shortCaption: copy.hook,
      hashtags,
      imagePrompt: copy.visual
    },
    facebook: {
      caption: `${copy.caption}\n\n${copy.cta}: ${config.website}`,
      hashtags: hashtags.slice(0, 8),
      imagePrompt: copy.visual
    },
    tiktok: {
      hook: copy.hook,
      script: `Shot 1: rustige productvisual. Shot 2: geurprofiel in beeld. Shot 3: CTA '${copy.cta}'.`,
      caption: `${copy.hook} ${hashtags.slice(0, 8).join(" ")}`,
      hashtags: hashtags.slice(0, 8),
      videoIdea: `${copy.visual}, korte premium reel met zachte beweging en duidelijke CTA`
    },
    callToAction: copy.cta,
    status: "concept",
    complianceCheck: { passed: false, reason: "Nog niet gecontroleerd." },
    toneWarning: null,
    duplicateCheck: { isDuplicate: false, score: 0, matchedPost: null },
    asset: null,
    approvedBy: null,
    approvedAt: null,
    scheduledAt: null,
    publishedAt: null,
    createdAt: new Date().toISOString()
  };

  post.complianceCheck = checkCompliance(post, config, forbidden);
  post.toneWarning = checkTone(post);
  post.duplicateCheck = checkDuplicate(post, { windowDays: config.duplicateCheckWindowDays });
  if (!post.complianceCheck.passed || post.duplicateCheck.isDuplicate) {
    post.status = "rejected";
    if (post.duplicateCheck.isDuplicate && !post.complianceCheck.reason) {
      post.complianceCheck.reason = `Te veel overlap met ${post.duplicateCheck.matchedPost}.`;
    }
  }
  return post;
}

function generatePostForDate(date) {
  ensureProjectDirs();
  const post = buildPost(date);
  savePost(post);
  return post;
}

if (require.main === module) {
  const post = generatePostForDate(parseDateArg("date", new Date()));
  console.log(JSON.stringify({
    id: post.id,
    date: post.date,
    category: post.category,
    status: post.status,
    compliance: post.complianceCheck,
    duplicate: post.duplicateCheck,
    toneWarning: post.toneWarning
  }, null, 2));
}

module.exports = { generatePostForDate, buildPost, checkCompliance };
