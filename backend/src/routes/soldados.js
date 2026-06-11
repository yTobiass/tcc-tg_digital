const { Router } = require('express');
const multer = require('multer');
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const c = require('../controllers/soldadoController');
const pontos = require('../controllers/pontosController');

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Rotas sem parâmetro dinâmico devem vir antes de /:id
router.get('/modelo-planilha', auth, roles('comandante', 'sargento'), c.modeloPlanilha);
router.post('/importar', auth, roles('comandante', 'sargento'), upload.single('arquivo'), c.importar);

router.get('/', auth, roles('comandante', 'sargento'), c.listar);
router.get('/:id', auth, roles('comandante', 'sargento'), c.buscarPorId);
router.get('/:id/guardas', auth, roles('comandante', 'sargento'), c.guardas);
router.post('/', auth, roles('comandante', 'sargento'), c.criar);
router.put('/:id', auth, roles('comandante', 'sargento'), c.atualizar);

// ── Pontos e FATD ────────────────────────────────────────────────────────────
// Acesso restrito a sargento/comandante (soldado não acessa perfil/pontos).
router.get('/:id/pontos', auth, roles('comandante', 'sargento'), pontos.historico);
router.post('/:id/fatd', auth, roles('comandante', 'sargento'), pontos.aplicarFATD);
router.patch('/:id/pontos/ajuste', auth, roles('comandante', 'sargento'), pontos.ajustar);
router.delete('/:id/pontos/:registroId', auth, roles('comandante', 'sargento'), pontos.estornar);

module.exports = router;
