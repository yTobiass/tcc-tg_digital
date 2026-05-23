const { Router } = require('express');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const c = require('../controllers/treinoController');

const router = Router();

// Rotas sem parâmetro dinâmico primeiro
router.get('/tipos',     auth, c.listarTipos);
router.get('/sessao',    auth, roles('comandante', 'sargento'), c.buscarSessao);
router.get('/historico', auth, roles('comandante', 'sargento'), c.listarSessoes);
router.get('/dashboard', auth, roles('comandante', 'sargento'), c.dashboard);
router.post('/lote',     auth, roles('comandante', 'sargento'), c.salvarLote);

module.exports = router;
