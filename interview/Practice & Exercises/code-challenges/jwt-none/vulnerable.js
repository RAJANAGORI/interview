const jwt = require("jsonwebtoken");

function auth(token) {
  // BUG: accepts alg=none if library misconfigured / manual decode
  return jwt.verify(token, null, { algorithms: ["none", "HS256"] });
}

module.exports = { auth };
