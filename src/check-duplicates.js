const fs = require("fs");
const { getAllPostFiles, readJson, tokenize, normalizeText } = require("./utils");

function overlapScore(a, b) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;
  let matches = 0;
  left.forEach((token) => {
    if (right.has(token)) matches += 1;
  });
  return Math.round((matches / Math.max(left.size, right.size)) * 100);
}

function collectCaption(post) {
  return normalizeText([
    post?.instagram?.caption,
    post?.facebook?.caption,
    post?.tiktok?.caption,
    post?.tiktok?.script
  ].filter(Boolean).join(" "));
}

function withinWindow(postDate, candidateDate, windowDays) {
  if (!postDate || !candidateDate) return true;
  const diff = Math.abs(new Date(postDate) - new Date(candidateDate));
  return diff <= windowDays * 24 * 60 * 60 * 1000;
}

function checkDuplicate(post, options = {}) {
  const windowDays = options.windowDays || 30;
  const newText = collectCaption(post);
  let best = { isDuplicate: false, score: 0, matchedPost: null };

  for (const item of getAllPostFiles(["drafts", "approved", "scheduled", "published"])) {
    const candidate = JSON.parse(fs.readFileSync(item.filePath, "utf8"));
    if (candidate.id === post.id) continue;
    if (!withinWindow(post.date, candidate.date, windowDays)) continue;
    const score = overlapScore(newText, collectCaption(candidate));
    if (score > best.score) {
      best = {
        isDuplicate: score >= 80,
        score,
        matchedPost: candidate.id
      };
    }
  }

  return best;
}

if (require.main === module) {
  const postId = process.argv[2];
  if (!postId) {
    console.log("Gebruik: node src/check-duplicates.js <post-id>");
    process.exit(0);
  }
  const post = readJson(`drafts/${postId}.json`) || readJson(`approved/${postId}.json`);
  if (!post) throw new Error(`Post niet gevonden: ${postId}`);
  console.log(JSON.stringify(checkDuplicate(post), null, 2));
}

module.exports = { checkDuplicate, overlapScore, collectCaption };
