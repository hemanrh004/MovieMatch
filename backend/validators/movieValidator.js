const { rules: r } = require('../middleware/validationMiddleware');

exports.pageQuery = { query: { page: r.int({ min: 1, max: 500, default: 1 }) } };
exports.movieIdParam = { params: { movieId: r.int({ required: true, min: 1 }) } };
exports.genreIdParam = { params: { genreId: r.int({ required: true, min: 1 }) } };
exports.searchRules = { query: { query: r.string({ required: true, min: 1, max: 100 }), page: r.int({ min: 1, max: 500, default: 1 }) } };
exports.watchlistBody = { body: { movieId: r.int({ required: true, min: 1 }) } };
exports.swipeBody = { body: { movieId: r.int({ required: true, min: 1 }), action: r.enum(['like', 'dislike'], { required: true }) } };
exports.listQuery = { query: { page: r.int({ min: 1, default: 1 }), limit: r.int({ min: 1, max: 50 }) } };
