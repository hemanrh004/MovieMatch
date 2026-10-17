const mongoose = require('mongoose');

const swipeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: Number, required: true },
  action: { type: String, enum: ['like', 'dislike'], required: true },
  // Snapshot of the movie's attributes: lets the recommender learn without re-fetching TMDB.
  genreIds: [{ type: Number }],
  language: { type: String },
  autoWatchlisted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

swipeSchema.index({ userId: 1, movieId: 1 }, { unique: true }); // one swipe record per user+movie
swipeSchema.index({ userId: 1, action: 1, createdAt: -1 });
swipeSchema.index({ movieId: 1, action: 1 }); // similar-user lookups

module.exports = mongoose.model('Swipe', swipeSchema);
