// Tracks which users are online (a user may have several tabs/devices = several sockets).
const online = new Map(); // userId -> Set(socketId)

const add = (userId, socketId) => {
  const set = online.get(userId) || new Set();
  set.add(socketId);
  online.set(userId, set);
  return set.size === 1; // true if this is the user's first connection
};
const remove = (userId, socketId) => {
  const set = online.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) { online.delete(userId); return true; } // true if user is now fully offline
  return false;
};
const isOnline = (userId) => online.has(String(userId));

module.exports = { add, remove, isOnline };
