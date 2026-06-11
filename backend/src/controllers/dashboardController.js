const model = require('../models/dashboardModel');

function buscar(_req, res) {
  res.json({
    resumo:             model.resumo(),
    presencaSemanal:    model.presencaSemanal(),
    presencaPorPelotao: model.presencaPorPelotao(),
    proximasEscalas:    model.proximasEscalas(),
    alertasDisciplina:  model.alertasDisciplina(),
  });
}

module.exports = { buscar };
