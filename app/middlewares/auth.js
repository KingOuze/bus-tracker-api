const jwt = require("jsonwebtoken")

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      error: "Token d'accès requis",
      message: "Veuillez fournir un token d'authentification valide",
    })
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, user) => {
    if (err) {
      return res.status(401).json({
        error: "Token invalide",
        message: "Le token fourni n'est pas valide ou a expiré",
      })
    }
    console.log("Token payload:", user)
    req.user = user
    next()
  })
}

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    res.status(403).json({ message: "Accès refusé" });
  };
};

module.exports = {
  authenticateToken,
  requireRole,
}
