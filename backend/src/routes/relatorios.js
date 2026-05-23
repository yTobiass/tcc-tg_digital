const { Router } = require('express');
const auth  = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl  = require('../controllers/relatorioController');

const router = Router();
const staff  = [auth, roles('comandante', 'sargento')];

router.get('/presenca',  ...staff, ctrl.relatorioPresenca);
router.get('/evolucao',  ...staff, ctrl.relatorioEvolucao);
router.get('/efetivo',   ...staff, ctrl.relatorioEfetivo);

module.exports = router;
