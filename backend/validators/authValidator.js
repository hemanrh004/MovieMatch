const { rules: r } = require('../middleware/validationMiddleware');

exports.registerRules = {
  body: {
    name: r.string({ required: true, min: 2, max: 50 }),
    email: r.email({ required: true }),
    password: r.password(),
  },
};

exports.loginRules = {
  body: {
    email: r.email({ required: true }),
    password: r.string({ required: true, max: 128, trim: false }),
  },
};
