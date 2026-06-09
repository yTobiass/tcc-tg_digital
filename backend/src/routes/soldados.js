const { Router } = require('express');
const multer = require('multer');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const c = require('../controllers/soldadoController');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Rotas sem parâmetro dinâmico devem vir antes de /:id
router.get('/modelo-planilha', auth, roles('comandante', 'sargento'), c.modeloPlanilha);
router.post('/importar', auth, roles('comandante', 'sargento'), upload.single('arquivo'), c.importar);

router.get('/', auth, c.listar);
router.get('/:id', auth, c.buscarPorId);
router.get('/:id/guardas', auth, c.guardas);
router.post('/', auth, roles('comandante', 'sargento'), c.criar);
router.put('/:id', auth, roles('comandante', 'sargento'), c.atualizar);

module.exports = router;
