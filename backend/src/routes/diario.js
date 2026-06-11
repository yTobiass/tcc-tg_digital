const router = require('express').Router();
const auth   = require('../middlewares/auth');
const roles  = require('../middlewares/roles');
const ctrl   = require('../controllers/diarioController');

const staff = [auth, roles('comandante', 'sargento')];

// Leitura: qualquer autenticado (inclui soldado, somente visualização).
// Escrita: apenas staff. Rotas sem parâmetro dinâmico vêm antes.
router.get   ('/contexto',   auth, ctrl.contexto);
router.get   ('/',           auth, ctrl.listar);
router.post  ('/',           ...staff, ctrl.criar);
router.get   ('/:data',      auth, ctrl.buscarPorData);
router.put   ('/:id',        ...staff, ctrl.atualizar);
router.patch ('/:id/pdf',    ...staff, ctrl.marcarPdf);

module.exports = router;
