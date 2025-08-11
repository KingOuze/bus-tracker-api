const express = require("express")
const { body, query, param, validationResult } = require("express-validator")
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

// GET /api/lines - Obtenir toutes les lignes
router.get(
  "/",
  [
    query("status").optional().isIn(["active", "inactive", "maintenance", "disrupted"]),
    query("type").optional().isIn(["bus", "tram", "metro"]),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { status, type, limit = 50, page = 1 } = req.query
      const query = {}

      if (status) query.status = status
      if (type) query.type = type

      const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

      const lines = await Line.find(query).sort({ name: 1 }).limit(Number.parseInt(limit)).skip(skip)

      const total = await Line.countDocuments(query)

      res.json({
        lines,
        pagination: {
          current: Number.parseInt(page),
          total: Math.ceil(total / Number.parseInt(limit)),
          count: lines.length,
          totalLines: total,
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

// GET /api/lines/:lineId - Obtenir une ligne spécifique
router.get("/:lineId", [param("lineId").isString().notEmpty()], handleValidationErrors, async (req, res) => {
  try {
    const line = await Line.findOne({ lineId: req.params.lineId })

    if (!line) {
      return res.status(404).json({
        error: "Ligne non trouvée",
        message: `La ligne ${req.params.lineId} n'existe pas`,
      })
    }

    res.json(line)
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

// POST /api/lines - Créer une nouvelle ligne (Admin/Operator requis)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "operator"),
  [
    body("lineId").isString().notEmpty().withMessage("L'ID de la ligne est requis"),
    body("name").isString().notEmpty().withMessage("Le nom de la ligne est requis"),
    body("shortName").isString().notEmpty().withMessage("Le nom court est requis"),
    body("color").optional().isHexColor().withMessage("La couleur doit être un code hexadécimal valide"),
    body("type").optional().isIn(["bus", "tram", "metro"]).withMessage("Type de ligne invalide"),
    body("status").optional().isIn(["active", "inactive", "maintenance", "disrupted"]).withMessage("Statut invalide"),
    body("route.outbound").isArray().withMessage("L'itinéraire aller doit être un tableau"),
    body("route.inbound").isArray().withMessage("L'itinéraire retour doit être un tableau"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const line = new Line(req.body)
      await line.save()
      res.status(201).json(line)
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          error: "Ligne déjà existante",
          message: `La ligne ${req.body.lineId} existe déjà`,
        })
      }
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// PUT /api/lines/:lineId - Mettre à jour une ligne (Admin/Operator requis)
router.put(
  "/:lineId",
  authenticateToken,
  authorizeRoles("admin", "operator"),
  [
    param("lineId").isString().notEmpty(),
    body("name").optional().isString().notEmpty(),
    body("shortName").optional().isString().notEmpty(),
    body("color").optional().isHexColor(),
    body("type").optional().isIn(["bus", "tram", "metro"]),
    body("status").optional().isIn(["active", "inactive", "maintenance", "disrupted"]),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const line = await Line.findOneAndUpdate({ lineId: req.params.lineId }, req.body, {
        new: true,
        runValidators: true,
      })

      if (!line) {
        return res.status(404).json({
          error: "Ligne non trouvée",
          message: `La ligne ${req.params.lineId} n'existe pas`,
        })
      }

      res.json(line)
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// DELETE /api/lines/:lineId - Supprimer une ligne (Admin requis)
router.delete(
  "/:lineId",
  authenticateToken,
  authorizeRoles("admin"),
  [param("lineId").isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const line = await Line.findOneAndDelete({ lineId: req.params.lineId })

      if (!line) {
        return res.status(404).json({
          error: "Ligne non trouvée",
          message: `La ligne ${req.params.lineId} n'existe pas`,
        })
      }

      res.json({
        message: "Ligne supprimée avec succès",
        lineId: req.params.lineId,
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// GET /api/lines/:lineId/stops - Obtenir les arrêts d'une ligne
router.get("/:lineId/stops", [param("lineId").isString().notEmpty()], handleValidationErrors, async (req, res) => {
  try {
    const line = await Line.findOne({ lineId: req.params.lineId }).select("route.outbound route.inbound")

    if (!line) {
      return res.status(404).json({
        error: "Ligne non trouvée",
      })
    }

    res.json({
      lineId: req.params.lineId,
      stops: line.getAllStops(),
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

module.exports = router
