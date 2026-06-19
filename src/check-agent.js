const fs = require("fs");
const { buildPost } = require("./generate-daily-post");
const { checkTone } = require("./check-tone");
const { checkDuplicate } = require("./check-duplicates");
const { resolveRoot, readJson, ensureProjectDirs, getAllPostFiles } = require("./utils");

const REQUIRED_DIRS = [
  "src",
  "content-calendar",
  "drafts",
  "approved",
  "rejected",
  "scheduled",
  "published",
  "assets",
  "logs",
  "config"
];

const REQUIRED_FILES = [
  "package.json",
  ".env.example",
  ".gitignore",
  "audit-log.json",
  "config/social-agent-config.json",
  "config/seasonalEvents.json",
  "config/forbiddenPhrases.json",
  "src/generate-daily-post.js",
  "src/generate-weekly-calendar.js",
  "src/check-duplicates.js",
  "src/check-tone.js",
  "src/status-manager.js",
  "src/publishers.js",
  "src/utils.js"
];

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function scanForSecrets() {
  const risky = [];
  const files = [
    ...fs.readdirSync(resolveRoot("src")).map((name) => `src/${name}`),
    ...fs.readdirSync(resolveRoot("config")).map((name) => `config/${name}`)
  ].filter((name) => name.endsWith(".js") || name.endsWith(".json"));
  for (const file of files) {
    const text = fs.readFileSync(resolveRoot(file), "utf8");
    if (/api[_-]?key\s*[:=]\s*["'][^"']{12,}/i.test(text)) risky.push(file);
    if (/access[_-]?token\s*[:=]\s*["'][^"']{12,}/i.test(text)) risky.push(file);
  }
  return risky;
}

function runChecks() {
  ensureProjectDirs();
  const failures = [];
  const warnings = [];
  const config = readJson("config/social-agent-config.json", {});

  REQUIRED_DIRS.forEach((dir) => assert(fs.existsSync(resolveRoot(dir)), `Map ontbreekt: ${dir}`, failures));
  REQUIRED_FILES.forEach((file) => assert(fs.existsSync(resolveRoot(file)), `Bestand ontbreekt: ${file}`, failures));
  assert(config.autoPublish === false, "autoPublish moet standaard false zijn.", failures);
  assert(config.requiresApproval === true, "requiresApproval moet true zijn.", failures);
  assert(config.allowPerfumeReferences === false, "allowPerfumeReferences moet false zijn.", failures);

  const sample = buildPost(new Date("2026-06-18T12:00:00Z"));
  assert(sample.complianceCheck.passed === true, `Compliance test faalt: ${sample.complianceCheck.reason}`, failures);
  const tone = checkTone(sample);
  if (tone) warnings.push(tone);
  const duplicate = checkDuplicate(sample, { windowDays: 30 });
  if (duplicate.isDuplicate) warnings.push(`Voorbeeldpost lijkt op ${duplicate.matchedPost} (${duplicate.score}%).`);

  const secretFiles = scanForSecrets();
  assert(secretFiles.length === 0, `Mogelijke hardcoded secrets gevonden: ${secretFiles.join(", ")}`, failures);

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    draftCount: getAllPostFiles(["drafts"]).length,
    approvedCount: getAllPostFiles(["approved"]).length,
    rejectedCount: getAllPostFiles(["rejected"]).length
  };
}

if (require.main === module) {
  const result = runChecks();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

module.exports = { runChecks };
