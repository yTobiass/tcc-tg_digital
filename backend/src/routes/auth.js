const { Router } = require('express');
const authMiddleware = require('../middlewares/auth');
const { login, me } = require('../controllers/authController');

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, me);

module.exports = router;
