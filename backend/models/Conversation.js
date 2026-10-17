const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    key: { type: String, required: true, unique: true }, // sorted "idA_idB": one conversation per pair
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

conversationSchema.statics.makeKey = (a, b) => [String(a), String(b)].sort().join('_');

module.exports = mongoose.model('Conversation', conversationSchema);
