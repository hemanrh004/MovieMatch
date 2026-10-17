const mongoose = require('mongoose');

// One discussion "room" per TMDB movie id: all messages sharing a movieId.
const discussionSchema = new mongoose.Schema(
  {
    movieId: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscussionMessage', default: null },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

discussionSchema.index({ movieId: 1, createdAt: -1 });

module.exports = mongoose.model('DiscussionMessage', discussionSchema);
