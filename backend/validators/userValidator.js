const { rules: r } = require('../middleware/validationMiddleware');

const genres = r.array(r.string({ required: true, max: 30 }), { max: 20 });
const languages = r.array(r.string({ required: true, max: 30 }), { max: 20 });
const favoriteMovies = r.array(r.int({ required: true, min: 1 }), { max: 20 });

exports.profileRules = {
  body: {
    name: r.string({ min: 2, max: 50 }),
    bio: r.string({ max: 300, allowEmpty: true }),
    avatar: r.string({ max: 500, allowEmpty: true }),
    genres, languages, favoriteMovies,
  },
};

exports.preferencesRules = {
  body: { genres: r.array(r.string({ required: true, max: 30 }), { required: true, min: 1, max: 20 }), languages, favoriteMovies },
};

exports.idParam = { params: { id: r.objectId({ required: true }) } };
