const errorHandler = (err, req, res, next) => {
  console.error("❌ Erreur:", err)

  // Erreur de validation Mongoose
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message)
    return res.status(400).json({
      error: "Erreur de validation",
      message: "Les données fournies ne sont pas valides",
      details: errors,
    })
  }

  // Erreur de cast Mongoose (ID invalide)
  if (err.name === "CastError") {
    return res.status(400).json({
      error: "ID invalide",
      message: "L'identifiant fourni n'est pas valide",
    })
  }

  // Erreur de duplication (clé unique)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json({
      error: "Données dupliquées",
      message: `${field} existe déjà`,
    })
  }

  // Erreur JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Token invalide",
      message: "Le token d'authentification n'est pas valide",
    })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expiré",
      message: "Le token d'authentification a expiré",
    })
  }

  // Erreur par défaut
  res.status(err.status || 500).json({
    error: err.message || "Erreur interne du serveur",
    message: "Une erreur inattendue s'est produite",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

module.exports = errorHandler
