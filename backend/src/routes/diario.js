const router = require('express').Router();
const auth   = require('../middlewares/auth');
const roles  = require('../middlewares/roles');
const ctrl   = require('../controllers/diarioController');

const staff = [auth, roles('comandante', 'sargento')];

// Rota sem parâmetro dinâmico deve vir antes
router.get   ('/contexto',   ...staff, ctrl.contexto);
router.get   ('/',           ...staff, ctrl.listar);
router.post  ('/',           ...staff, ctrl.criar);
router.get   ('/:data',      ...staff, ctrl.buscarPorData);
router.put   ('/:id',        ...staff, ctrl.atualizar);
router.patch ('/:id/pdf',    ...staff, ctrl.marcarPdf);

module.exports = router;
