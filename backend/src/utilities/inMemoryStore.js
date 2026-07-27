const usersByEmail = new Map();
const usersById = new Map();
let idCounter = 1;

function createUser({ name, email, password, role }) {
  const id = `mem-${idCounter++}`;
  const user = { _id: id, name, email, password, role, verified: false };
  usersByEmail.set(email, user);
  usersById.set(id, user);
  return user;
}

function getUserByEmail(email) {
  return usersByEmail.get(email) || null;
}

function getUserById(id) {
  return usersById.get(id) || null;
}

module.exports = { createUser, getUserByEmail, getUserById };
