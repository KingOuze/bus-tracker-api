const express = require("express")
const { query, param, validationResult } = require("express-validator")
const Prediction = require("../models/Prediction")
const PredictionService = require("../services/predictionService")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()
const predictionService = new PredictionService()

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Données invalides",
      details: errors.array(),
    })
  }
  next()
}

// GET /api/predictions - Obtenir les prédictions
router.get(
  "/",
  [
    query("busId").optional().isString(),
    query("lineId").optional().isString(),
    query("algorithm")
      .optional()
      .isIn(["linear_regression", "exponential_moving_average", "seasonal_analysis", "ensemble"]),
    query("type").optional().isIn(["arrival", "delay", "occupancy", "disruption"]),
    query("horizon").optional().isInt({ min: 1, max: 720 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { busId, lineId, algorithm = "ensemble", type = "delay", horizon, limit = 50 } = req.query

      const query = {
        expiresAt: { $gt: new Date() }, // Seulement les prédictions non expirées
      }

      if (busId) query.busId = busId
      if (lineId) query.lineId = lineId
      if (algorithm) query.algorithm = algorithm
      if (type) query.predictionType = type
      if (horizon) query.horizon = { $lte: Number.parseInt(horizon) }

      const predictions = await Prediction.find(query)
        .populate("lineId", "lineId name shortName color")
        .sort({ createdAt: -1, confidence: -1 })
        .limit(Number.parseInt(limit))

      res.json({
        predictions,
        count: predictions.length,
        algorithm: algorithm,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// GET /api/predictions/performance - Statistiques de performance
router.get("/performance", async (req, res) => {
  try {
    const stats = await predictionService.getPerformanceStats()

    res.json({
      performance: stats,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

// GET /api/predictions/bus/:busId - Prédictions pour un bus spécifique
router.get(
  "/bus/:busId",
  [
    param("busId").isString().notEmpty(),
    query("algorithm")
      .optional()
      .isIn(["linear_regression", "exponential_moving_average", "seasonal_analysis", "ensemble"]),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { busId } = req.params
      const { algorithm = "ensemble" } = req.query

      const predictions = await Prediction.find({
        busId: busId,
        algorithm: algorithm,
        expiresAt: { $gt: new Date() },
      })
        .populate("lineId", "lineId name shortName color")
        .sort({ horizon: 1 })

      if (predictions.length === 0) {
        return res.status(404).json({
          error: "Aucune prédiction trouvée",
          message: `Aucune prédiction disponible pour le bus ${busId}`,
        })
      }

      // Grouper par type de prédiction
      const groupedPredictions = predictions.reduce((acc, pred) => {
        if (!acc[pred.predictionType]) {
          acc[pred.predictionType] = []
        }
        acc[pred.predictionType].push(pred)
        return acc
      }, {})

      res.json({
        busId: busId,
        algorithm: algorithm,
        predictions: groupedPredictions,
        totalPredictions: predictions.length,
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// POST /api/predictions/generate - Générer de nouvelles prédictions (authentification requise)
router.post("/generate", authenticateToken, async (req, res) => {
  try {
    await predictionService.generatePredictions()

    res.json({
      message: "Prédictions générées avec succès",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur lors de la génération",
      message: error.message,
    })
  }
})

// GET /api/predictions/alerts - Alertes prédictives
router.get(
  "/alerts",
  [query("severity").optional().isIn(["low", "medium", "high", "critical"]), query("line").optional().isString()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { severity, line } = req.query

      // Trouver les prédictions avec des retards importants
      const query = {
        predictionType: "delay",
        predictedValue: { $gt: 10 }, // Plus de 10 minutes de retard
        confidence: { $gt: 70 }, // Confiance > 70%
        expiresAt: { $gt: new Date() },
      }

      if (line) {
        const Line = require("../models/Line")
        const lineDoc = await Line.findOne({ lineId: line })
        if (lineDoc) {
          query.lineId = lineDoc._id
        }
      }

      const predictions = await Prediction.find(query)
        .populate("lineId", "lineId name shortName color")
        .sort({ predictedValue: -1, confidence: -1 })
        .limit(20)

      // Convertir en format d'alerte
      const alerts = predictions
        .map((pred) => {
          let alertSeverity = "low"
          if (pred.predictedValue > 20) alertSeverity = "critical"
          else if (pred.predictedValue > 15) alertSeverity = "high"
          else if (pred.predictedValue > 10) alertSeverity = "medium"

          // Filtrer par sévérité si spécifiée
          if (severity && alertSeverity !== severity) return null

          return {
            id: pred._id,
            type: "prediction",
            severity: alertSeverity,
            busId: pred.busId,
            line: pred.lineId,
            message: `Retard de ${pred.predictedValue.toFixed(1)} minutes prévu`,
            confidence: pred.confidence,
            horizon: pred.horizon,
            factors: pred.factors,
            createdAt: pred.createdAt,
          }
        })
        .filter(Boolean)

      res.json({
        alerts,
        count: alerts.length,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

module.exports = router
