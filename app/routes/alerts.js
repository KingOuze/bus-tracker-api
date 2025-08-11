const express = require("express")
const { body, query, param, validationResult } = require("express-validator")
const Alert = require("../models/Alert")
const Line = require("../models/Line")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")

const router = express.Router()

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

// GET /api/alerts - Obtenir toutes les alertes
router.get(
  "/",
  [
    query("status").optional().isIn(["active", "resolved", "scheduled", "cancelled"]),
    query("severity").optional().isIn(["low", "medium", "high", "critical"]),
    query("type").optional().isIn(["info", "warning", "error", "success", "maintenance", "disruption"]),
    query("line").optional().isString(),
    query("lat").optional().isFloat({ min: -90, max: 90 }),
    query("lng").optional().isFloat({ min: -180, max: 180 }),
    query("radius")
      .optional()
      .isFloat({ min: 0.1, max: 100 }), // km
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, severity, type, line, lat, lng, radius = 10, limit = 50, page = 1 } = req.query
      const query = {}

      if (status) query.status = status
      if (severity) query.severity = severity
      if (type) query.type = type

      if (line) {
        const lineDoc = await Line.findOne({ lineId: line })
        if (lineDoc) {
          query.affectedLines = lineDoc._id
        }
      }

      if (lat && lng) {
        query.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [Number.parseFloat(lng), Number.parseFloat(lat)],
            },
            $maxDistance: Number.parseFloat(radius) * 1000, // convertir km en mètres
          },
        }
      }

      const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

      const alerts = await Alert.find(query)
        .populate("affectedLines", "lineId name shortName color")
        .sort({ priority: -1, startTime: -1 })
        .limit(Number.parseInt(limit))
        .skip(skip)

      const total = await Alert.countDocuments(query)

      res.json({
        alerts,
        pagination: {
          current: Number.parseInt(page),
          total: Math.ceil(total / Number.parseInt(limit)),
          count: alerts.length,
          totalAlerts: total,
        },
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// GET /api/alerts/:alertId - Obtenir une alerte spécifique
router.get("/:alertId", [param("alertId").isString().notEmpty()], handleValidationErrors, async (req, res) => {
  try {
    const alert = await Alert.findOne({ alertId: req.params.alertId }).populate(
      "affectedLines",
      "lineId name shortName color",
    )

    if (!alert) {
      return res.status(404).json({
        error: "Alerte non trouvée",
        message: `L'alerte ${req.params.alertId} n'existe pas`,
      })
    }

    res.json(alert)
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

// POST /api/alerts - Créer une nouvelle alerte (Admin/Operator requis)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "operator"),
  [
    body("alertId").isString().notEmpty().withMessage("L'ID de l'alerte est requis"),
    body("type")
      .isIn(["info", "warning", "error", "success", "maintenance", "disruption"])
      .withMessage("Type d'alerte invalide"),
    body("severity").isIn(["low", "medium", "high", "critical"]).withMessage("Sévérité invalide"),
    body("title").isString().notEmpty().withMessage("Le titre est requis"),
    body("message").isString().notEmpty().withMessage("Le message est requis"),
    body("source").isIn(["system", "operator", "prediction", "external", "user"]).withMessage("Source invalide"),
    body("category")
      .isIn(["delay", "cancellation", "route_change", "technical", "weather", "traffic", "event"])
      .withMessage("Catégorie invalide"),
    body("affectedLines")
      .optional()
      .isArray()
      .withMessage("Les lignes affectées doivent être un tableau d'IDs de lignes"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { affectedLines, ...rest } = req.body

      // Convertir les lineId en ObjectId
      let lineObjectIds = []
      if (affectedLines && affectedLines.length > 0) {
        const lines = await Line.find({ lineId: { $in: affectedLines } }).select("_id")
        lineObjectIds = lines.map((line) => line._id)
      }

      const alert = new Alert({
        ...rest,
        affectedLines: lineObjectIds,
      })
      await alert.save()

      const populatedAlert = await Alert.findById(alert._id).populate("affectedLines", "lineId name shortName color")

      res.status(201).json(populatedAlert)
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          error: "Alerte déjà existante",
          message: `L'alerte ${req.body.alertId} existe déjà`,
        })
      }
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// PUT /api/alerts/:alertId - Mettre à jour une alerte (Admin/Operator requis)
router.put(
  "/:alertId",
  authenticateToken,
  authorizeRoles("admin", "operator"),
  [
    param("alertId").isString().notEmpty(),
    body("status").optional().isIn(["active", "resolved", "scheduled", "cancelled"]),
    body("severity").optional().isIn(["low", "medium", "high", "critical"]),
    body("title").optional().isString().notEmpty(),
    body("message").optional().isString().notEmpty(),
    body("affectedLines").optional().isArray(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { affectedLines, ...rest } = req.body

      const updateData = { ...rest }
      if (affectedLines !== undefined) {
        const lines = await Line.find({ lineId: { $in: affectedLines } }).select("_id")
        updateData.affectedLines = lines.map((line) => line._id)
      }

      const alert = await Alert.findOneAndUpdate({ alertId: req.params.alertId }, updateData, {
        new: true,
        runValidators: true,
      }).populate("affectedLines", "lineId name shortName color")

      if (!alert) {
        return res.status(404).json({
          error: "Alerte non trouvée",
          message: `L'alerte ${req.params.alertId} n'existe pas`,
        })
      }

      res.json(alert)
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// DELETE /api/alerts/:alertId - Supprimer une alerte (Admin requis)
router.delete(
  "/:alertId",
  authenticateToken,
  authorizeRoles("admin"),
  [param("alertId").isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const alert = await Alert.findOneAndDelete({ alertId: req.params.alertId })

      if (!alert) {
        return res.status(404).json({
          error: "Alerte non trouvée",
          message: `L'alerte ${req.params.alertId} n'existe pas`,
        })
      }

      res.json({
        message: "Alerte supprimée avec succès",
        alertId: req.params.alertId,
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// POST /api/alerts/:alertId/resolve - Résoudre une alerte (Admin/Operator requis)
router.post(
  "/:alertId/resolve",
  authenticateToken,
  authorizeRoles("admin", "operator"),
  [param("alertId").isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const alert = await Alert.findOne({ alertId: req.params.alertId })

      if (!alert) {
        return res.status(404).json({
          error: "Alerte non trouvée",
        })
      }

      if (alert.status === "resolved") {
        return res.status(400).json({
          error: "Alerte déjà résolue",
        })
      }

      await alert.resolve(req.user.username || req.user.email)

      res.json({
        message: "Alerte résolue avec succès",
        alert: alert,
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
