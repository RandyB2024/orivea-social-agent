const { normalizeText } = require("./utils");

const SALESY_WORDS = [
  "koop nu",
  "mis het niet",
  "laatste kans",
  "moet je hebben",
  "nu of nooit"
];

function hasTooManyExclamations(text) {
  return (String(text || "").match(/!/g) || []).length > 1;
}

function hasUnwantedCaps(text) {
  const words = String(text || "").match(/\b[A-ZÀ-Ý]{3,}\b/g) || [];
  return words.some((word) => word !== "ORIVÈA");
}

function checkTone(post) {
  const warnings = [];
  const captions = [
    post.instagram.caption,
    post.instagram.shortCaption,
    post.facebook.caption,
    post.tiktok.hook,
    post.tiktok.caption
  ];

  captions.forEach((caption) => {
    if (hasTooManyExclamations(caption)) warnings.push("Gebruik maximaal 1 uitroepteken per caption.");
    if (hasUnwantedCaps(caption)) warnings.push("Vermijd woorden volledig in hoofdletters, behalve ORIVÈA.");
    const normalized = normalizeText(caption);
    if (SALESY_WORDS.some((word) => normalized.includes(word))) {
      warnings.push("Toon is te commercieel of te urgent.");
    }
  });

  if (post.instagram.shortCaption.length > 150) {
    warnings.push("Instagram shortCaption is langer dan de richtlijn van circa 125 tekens.");
  }

  if (post.tiktok.hook.length > 80) {
    warnings.push("TikTok hook mag korter en krachtiger.");
  }

  return warnings.length ? Array.from(new Set(warnings)).join(" ") : null;
}

if (require.main === module) {
  console.log("Tone check module klaar. Importeer checkTone(post) of run npm run check.");
}

module.exports = { checkTone };
