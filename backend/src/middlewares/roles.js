// Uso: roles('comandante', 'sargento')
module.exports = function roles(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso não autorizado para este perfil.' });
    }
    next();
  };
};
