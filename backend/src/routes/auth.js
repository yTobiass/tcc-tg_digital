const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middlewares/auth');
const { login, me, trocarSenha } = require('../controllers/authController');

const router = Router();

// Limita tentativas de login a 10 por minuto por IP — mitiga força bruta/dicionário.
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em instantes.' });
  },
});

router.post('/login', loginLimiter, login);
router.get('/me', authMiddleware, me);
router.post('/trocar-senha', authMiddleware, trocarSenha);

module.exports = router;
