const router = require('express').Router();
const c = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { profileRules, preferencesRules, idParam } = require('../validators/userValidator');

router.use(protect);
router.get('/profile', c.getProfile);
router.put('/profile', validate(profileRules), c.updateProfile);
router.put('/preferences', validate(preferencesRules), c.updatePreferences);
router.get('/:id/compatibility', validate(idParam), c.getCompatibility);
router.get('/:id', validate(idParam), c.getUserById);

module.exports = router;
