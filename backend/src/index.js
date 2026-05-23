require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/usuarios',   require('./routes/usuarios'));
app.use('/api/soldados',   require('./routes/soldados'));
app.use('/api/treinos',    require('./routes/treinos'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/avaliacoes', require('./routes/avaliacoes'));
app.use('/api/diario',     require('./routes/diario'));
app.use('/api/escalas',    require('./routes/escalas'));
app.use('/api/relatorios', require('./routes/relatorios'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;
