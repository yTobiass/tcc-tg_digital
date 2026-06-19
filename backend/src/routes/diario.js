const router = require('express').Router();
const auth   = require('../middlewares/auth');
const ctrl   = require('../controllers/diarioController');

// Diário é editável por qualquer usuário autenticado (inclui soldado).
// Rotas sem parâmetro dinâmico vêm antes das com parâmetro.
router.get   ('/contexto',   auth, ctrl.contexto);
router.get   ('/',           auth, ctrl.listar);
router.post  ('/',           auth, ctrl.criar);
router.get   ('/:data',      auth, ctrl.buscarPorData);
router.put   ('/:id',        auth, ctrl.atualizar);
router.patch ('/:id/pdf',    auth, ctrl.marcarPdf);

module.exports = router;
