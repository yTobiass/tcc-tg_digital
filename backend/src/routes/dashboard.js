const { Router } = require('express');
const auth  = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const c     = require('../controllers/dashboardController');

const router = Router();

router.get('/', auth, roles('comandante', 'sargento'), c.buscar);

module.exports = router;
