const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String, required: true,
      enum: ['friend_request', 'friend_accepted', 'new_message', 'movie_discussion', 'recommendation'],
    },
    message: { type: String, required: true, maxlength: 300 },
    relatedId: { type: String }, // user id, conversation id, movie id... depending on type
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, updatedAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
