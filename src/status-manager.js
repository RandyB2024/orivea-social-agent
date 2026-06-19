const fs = require("fs");
const path = require("path");
const {
  resolveRoot,
  findPostFile,
  readJson,
  writeJson,
  appendAudit,
  updateCalendar
} = require("./utils");

function movePost(postId, newStatus, reviewer, extra = {}) {
  const found = findPostFile(postId);
  if (!found) throw new Error(`Post niet gevonden: ${postId}`);

  const post = JSON.parse(fs.readFileSync(found.filePath, "utf8"));
  const previousStatus = post.status;
  post.status = newStatus;

  if (newStatus === "approved") {
    post.approvedBy = reviewer;
    post.approvedAt = new Date().toISOString();
  }
  if (newStatus === "rejected") {
    post.rejectionReason = extra.reason || "Geen reden opgegeven.";
  }
  if (newStatus === "scheduled") {
    post.scheduledAt = extra.scheduledAt;
    post.scheduledBy = reviewer;
  }
  if (newStatus === "published") {
    post.publishedAt = new Date().toISOString();
    post.publishedBy = reviewer;
  }

  const targetDir = resolveRoot(newStatus);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, `${post.id}.json`);
  writeJson(`${newStatus}/${post.id}.json`, post);
  if (found.filePath !== targetFile && fs.existsSync(found.filePath)) {
    fs.unlinkSync(found.filePath);
  }

  appendAudit({
    postId,
    action: newStatus,
    by: reviewer,
    previousStatus,
    newStatus,
    reason: extra.reason || ""
  });
  updateCalendar(post);
  return post;
}

function approvePost(postId, reviewer) {
  return movePost(postId, "approved", reviewer);
}

function rejectPost(postId, reviewer, reason) {
  return movePost(postId, "rejected", reviewer, { reason });
}

function schedulePost(postId, reviewer, scheduledAt) {
  return movePost(postId, "scheduled", reviewer, { scheduledAt });
}

function markPublished(postId, reviewer) {
  return movePost(postId, "published", reviewer);
}

if (require.main === module) {
  const [action, postId, reviewer = "reviewer", ...rest] = process.argv.slice(2);
  const actions = {
    approve: () => approvePost(postId, reviewer),
    reject: () => rejectPost(postId, reviewer, rest.join(" ") || "Handmatig afgekeurd."),
    schedule: () => schedulePost(postId, reviewer, rest[0]),
    published: () => markPublished(postId, reviewer)
  };
  if (!actions[action] || !postId) {
    console.log("Gebruik: node src/status-manager.js approve|reject|schedule|published <postId> <reviewer> [reden|datum]");
    process.exit(0);
  }
  console.log(JSON.stringify(actions[action](), null, 2));
}

module.exports = { approvePost, rejectPost, schedulePost, markPublished };
