const { addDays, parseDateArg, formatDate } = require("./utils");
const { generatePostForDate } = require("./generate-daily-post");

function generateWeek(startDate) {
  const posts = [];
  for (let index = 0; index < 7; index += 1) {
    posts.push(generatePostForDate(addDays(startDate, index)));
  }
  return posts;
}

if (require.main === module) {
  const startDate = parseDateArg("start", new Date());
  const posts = generateWeek(startDate);
  console.log(JSON.stringify({
    start: formatDate(startDate),
    generated: posts.length,
    drafts: posts.filter((post) => post.status === "concept").length,
    rejected: posts.filter((post) => post.status === "rejected").length,
    posts: posts.map((post) => ({ id: post.id, category: post.category, status: post.status }))
  }, null, 2));
}

module.exports = { generateWeek };
