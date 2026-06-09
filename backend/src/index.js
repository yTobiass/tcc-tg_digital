require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
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

// 404 para rotas de API não encontradas (mantém resposta JSON consistente).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Recurso não encontrado.' });
});

// Error handler global — DEVE ser o último middleware e ter 4 argumentos.
// Loga o stack completo no servidor (com um requestId para correlação) e
// responde ao cliente apenas com uma mensagem genérica, sem detalhes internos.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const requestId = crypto.randomUUID();
  console.error(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err);

  if (res.headersSent) return next(err);

  res.status(err.status || 500).json({
    error: 'Ocorreu um erro interno. Tente novamente mais tarde.',
    requestId,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;
