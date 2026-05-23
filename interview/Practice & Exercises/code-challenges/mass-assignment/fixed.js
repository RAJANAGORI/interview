const ALLOWED = new Set(["name", "email"]);

function updateUser(req, user) {
  for (const [key, value] of Object.entries(req.body)) {
    if (ALLOWED.has(key)) user[key] = value;
  }
  return user.save();
}

module.exports = { updateUser };
