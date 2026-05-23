const { Router } = require('express');
const auth  = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const ctrl  = require('../controllers/usuarioController');

const router     = Router();
const comandante = [auth, roles('comandante')];

router.get('/',                  ...comandante, ctrl.listar);
router.post('/',                 ...comandante, ctrl.criar);
router.get('/:id',               ...comandante, ctrl.buscar);
router.put('/:id',               ...comandante, ctrl.atualizar);
router.delete('/:id',            ...comandante, ctrl.remover);
router.patch('/:id/reativar',    ...comandante, ctrl.reativar);

module.exports = router;
