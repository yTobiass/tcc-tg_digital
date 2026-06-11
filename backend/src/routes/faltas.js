const { Router } = require('express');
const auth  = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const c     = require('../controllers/faltasController');

const router = Router();

// Todas as rotas de faltas são restritas a sargento/comandante. O soldado vê
// apenas os próprios pontos/faltas via GET /api/soldados/:id/pontos.
const staff = [auth, roles('comandante', 'sargento')];

// Rotas estáticas antes das dinâmicas.
router.get   ('/dia',                    ...staff, c.doDia);
router.get   ('/',                       ...staff, c.historico);
router.post  ('/lote',                   ...staff, c.lote);
router.delete('/:registro_id/estorno',   ...staff, c.estorno);
router.post  ('/:soldado_id',            ...staff, c.individual);

module.exports = router;
