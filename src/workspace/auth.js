const bcrypt = require("bcryptjs");

async function verifyCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) return false;
  if (username !== expectedUser) return false;
  if (expectedPassword.startsWith("$2a$") || expectedPassword.startsWith("$2b$") || expectedPassword.startsWith("$2y$")) {
    return bcrypt.compare(password, expectedPassword);
  }
  return password === expectedPassword;
}

module.exports = { verifyCredentials };
