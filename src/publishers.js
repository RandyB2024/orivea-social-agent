const { readJson } = require("./utils");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`${label} poging ${attempt} mislukt:`, error.message);
      if (attempt < maxAttempts) await wait(2 ** attempt * 250);
    }
  }
  throw lastError;
}

function autopublishDisabledMessage() {
  const config = readJson("config/social-agent-config.json", {});
  if (!config.autoPublish) {
    console.log("AutoPublish staat uit. Niet gepubliceerd.");
    return true;
  }
  return false;
}

async function publishToInstagram(post) {
  return withRetry("Instagram publish", async () => {
    if (autopublishDisabledMessage()) return { published: false, platform: "instagram", postId: post?.id };
    console.log("Instagram publicatie placeholder.");
    return { published: true, platform: "instagram", postId: post?.id };
  });
}

async function publishToFacebook(post) {
  return withRetry("Facebook publish", async () => {
    if (autopublishDisabledMessage()) return { published: false, platform: "facebook", postId: post?.id };
    console.log("Facebook publicatie placeholder.");
    return { published: true, platform: "facebook", postId: post?.id };
  });
}

async function publishToTikTok(post) {
  return withRetry("TikTok publish", async () => {
    if (autopublishDisabledMessage()) return { published: false, platform: "tiktok", postId: post?.id };
    console.log("TikTok publicatie placeholder.");
    return { published: true, platform: "tiktok", postId: post?.id };
  });
}

module.exports = { publishToInstagram, publishToFacebook, publishToTikTok, withRetry };
