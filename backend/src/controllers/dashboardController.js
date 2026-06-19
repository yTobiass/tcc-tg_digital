const model = require('../models/dashboardModel');

function buscar(_req, res) {
  res.json({
    resumo:             model.resumo(),
    proximasEscalas:    model.proximasEscalas(),
    alertasDisciplina:  model.alertasDisciplina(),
  });
}

module.exports = { buscar };
