const router = require('express').Router();
const auth   = require('../middlewares/auth');
const roles  = require('../middlewares/roles');
const ctrl   = require('../controllers/escalasController');

const staff     = [auth, roles('comandante', 'sargento')];
const comandante = [auth, roles('comandante')];
const qualquer  = [auth];

// Rotas estáticas ANTES das dinâmicas
router.get  ('/sugestao',               ...staff,     ctrl.sugestao);
router.get  ('/calendario',             ...staff,     ctrl.calendario);
router.get  ('/bloqueios',              ...staff,     ctrl.listarBloqueios);
router.post ('/bloqueios',              ...comandante, ctrl.criarBloqueio);
router.delete('/bloqueios/:id',         ...comandante, ctrl.removerBloqueio);

router.post ('/fila/inicializar',       ...staff,     ctrl.inicializarFilas);
router.get  ('/fila/:tipo',             ...staff,     ctrl.fila);
router.post ('/fila/:tipo/reordenar',   ...staff,     ctrl.reordenar);

router.get  ('/soldado/:soldadoId',     ...qualquer,  ctrl.historicoPorSoldado);

router.get  ('/',                       ...staff,     ctrl.listar);
router.post ('/',                       ...staff,     ctrl.criar);
router.get  ('/:id',                    ...staff,     ctrl.buscar);
router.put  ('/:id',                    ...staff,     ctrl.atualizar);
router.put  ('/:id/membro',             ...staff,     ctrl.alterarMembro);
router.patch('/:id/status',             ...staff,     ctrl.alterarStatus);
router.delete('/:id',                   ...staff,     ctrl.remover);

module.exports = router;
