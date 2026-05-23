const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

function auth(token) {
  if (!SECRET) throw new Error("JWT_SECRET required");
  return jwt.verify(token, SECRET, { algorithms: ["HS256"] });
}

module.exports = { auth };
