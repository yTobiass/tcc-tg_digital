const router = require('express').Router();
const auth   = require('../middlewares/auth');
const roles  = require('../middlewares/roles');
const ctrl   = require('../controllers/avaliacaoController');

const staff = [auth, roles('comandante', 'sargento')];

router.get ('/minha-evolucao',        ...staff, ctrl.minhaEvolucao);
router.get ('/',                      ...staff, ctrl.listar);
router.post('/',                      ...staff, ctrl.criar);
router.put ('/:id',                   ...staff, ctrl.atualizar);
router.delete('/:id',                 ...staff, ctrl.remover);
router.get ('/evolucao/:soldadoId',   ...staff, ctrl.evolucao);

module.exports = router;
