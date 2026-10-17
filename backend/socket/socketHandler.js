const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Friend = require('../models/Friend');
const presence = require('./presence');
const registerChatHandlers = require('./chatHandler');

const friendIdsOf = async (userId) => {
  const rels = await Friend.find({ status: 'accepted', $or: [{ requester: userId }, { recipient: userId }] }).select('requester recipient').lean();
  return rels.map((r) => (String(r.requester) === userId ? String(r.recipient) : String(r.requester)));
};

const broadcastPresence = async (io, userId, event, extra = {}) => {
  const friends = await friendIdsOf(userId);
  friends.forEach((fid) => io.to(`user:${fid}`).emit(event, { userId, ...extra }));
};

module.exports = (io) => {
  // Authenticate every socket with the same JWT used by the REST API.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake.headers.authorization || '').replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));
      const { id } = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(id).select('name avatar');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      return next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`); // personal room: notifications, DMs, presence

    try {
      if (presence.add(userId, socket.id)) await broadcastPresence(io, userId, 'userOnline');
      const friends = await friendIdsOf(userId);
      socket.emit('onlineFriends', friends.filter((f) => presence.isOnline(f)));
    } catch (err) { console.error('Presence error:', err.message); }

    registerChatHandlers(io, socket);

    // Movie discussion rooms: join to receive `discussionMessage` / `discussionLike` events.
    socket.on('joinMovieRoom', ({ movieId } = {}, ack) => {
      if (Number.isInteger(Number(movieId)) && Number(movieId) > 0) {
        socket.join(`movie:${movieId}`);
        if (typeof ack === 'function') ack({ success: true, room: `movie:${movieId}` });
      } else if (typeof ack === 'function') ack({ success: false, message: 'Invalid movie id' });
    });
    socket.on('leaveMovieRoom', ({ movieId } = {}) => socket.leave(`movie:${movieId}`));

    socket.on('error', (err) => console.error(`Socket error (${userId}):`, err.message));

    socket.on('disconnect', async () => {
      if (presence.remove(userId, socket.id)) {
        try { await broadcastPresence(io, userId, 'userOffline', { lastSeen: new Date() }); } catch (e) { /* ignore */ }
      }
    });
  });
};
