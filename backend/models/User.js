const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String, default: '', maxlength: 500 },
    bio: { type: String, default: '', maxlength: 300 },
    genres: [{ type: String }],
    languages: [{ type: String }], // ISO 639-1 codes, e.g. "ko"
    favoriteMovies: [{ type: Number }], // TMDB movie ids
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ genres: 1 });
userSchema.index({ languages: 1 });

// Hash the password whenever it is set or changed. Plain text is never stored.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; delete ret.__v; return ret; },
});

module.exports = mongoose.model('User', userSchema);
