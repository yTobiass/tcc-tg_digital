// Bloqueia acesso a qualquer role não autorizado.
// Uso direto: roles('comandante', 'sargento')
// Ou via atalhos prontos: roles.apenasStaff / roles.apenasComandante
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    next();
  };
}

// Export default permanece a função (compatível com roles('comandante', 'sargento')).
module.exports = requireRole;
module.exports.requireRole = requireRole;
module.exports.apenasStaff = requireRole('comandante', 'sargento');
module.exports.apenasComandante = requireRole('comandante');
