const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: Number, required: true },
  addedAt: { type: Date, default: Date.now },
});

watchlistSchema.index({ userId: 1, movieId: 1 }, { unique: true }); // no duplicates
watchlistSchema.index({ userId: 1, addedAt: -1 });

module.exports = mongoose.model('Watchlist', watchlistSchema);
