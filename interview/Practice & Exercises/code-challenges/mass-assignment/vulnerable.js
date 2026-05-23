function updateUser(req, user) {
  // BUG: mass assignment — client can set isAdmin
  Object.assign(user, req.body);
  return user.save();
}

module.exports = { updateUser };
