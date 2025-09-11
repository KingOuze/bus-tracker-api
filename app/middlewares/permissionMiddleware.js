/**
 * Vérifie si l'utilisateur a la permission requise
 * @param {string} permission - Nom de la permission à vérifier
 */
function checkPermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Utilisateur non authentifié' });

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({ message: 'Vous n’avez pas la permission nécessaire' });
    }

    next();
  };
}

module.exports = checkPermission;
