const { Router } = require('express');
const auth  = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl  = require('../controllers/turmaController');

const router = Router();
const staff      = [auth, roles('comandante', 'sargento')];
const comandante = [auth, roles('comandante')];

// Encerramento: apenas comandante. Estáticas antes das dinâmicas.
router.post('/encerrar',          ...comandante, ctrl.encerrar);
router.get ('/ativa',             ...staff,      ctrl.ativa);
router.get ('/',                  ...staff,      ctrl.listar);
router.get ('/:id',               ...staff,      ctrl.buscar);
router.get ('/:id/soldados',      ...staff,      ctrl.soldados);
router.get ('/:id/escalas',       ...staff,      ctrl.escalas);
router.get ('/:id/faltas',        ...staff,      ctrl.faltas);
router.get ('/:id/ocorrencias',   ...staff,      ctrl.ocorrencias);

module.exports = router;
