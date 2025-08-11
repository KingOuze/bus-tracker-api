const express = require("express")
const { body, query, param, validationResult } = require("express-validator")
const Bus = require("../models/Bus")
const Line = require("../models/Line")
const { authenticateToken } = require("../middleware/auth")

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

// GET /api/buses - Obtenir tous les bus avec filtres
router.get(
  "/",
  [
    query("line").optional().isString(),
    query("status").optional().isIn(["active", "inactive", "maintenance", "delayed", "onTime"]),
    query("lat").optional().isFloat({ min: -90, max: 90 }),
    query("lng").optional().isFloat({ min: -180, max: 180 }),
    query("radius").optional().isFloat({ min: 0.1, max: 50 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { line, status, lat, lng, radius = 5, limit = 50, page = 1 } = req.query

      const query = {}

      // Filtrer par ligne
      if (line) {
        const lineDoc = await Line.findOne({ lineId: line })
        if (lineDoc) {
          query.lineId = lineDoc._id
        }
      }

      // Filtrer par statut
      if (status) {
        query.status = status
      }

      // Filtrer par géolocalisation
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

      const buses = await Bus.find(query)
        .populate("lineId", "lineId name shortName color")
        .sort({ lastUpdated: -1 })
        .limit(Number.parseInt(limit))
        .skip(skip)

      const total = await Bus.countDocuments(query)

      res.json({
        buses,
        pagination: {
          current: Number.parseInt(page),
          total: Math.ceil(total / Number.parseInt(limit)),
          count: buses.length,
          totalBuses: total,
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

// GET /api/buses/:busId - Obtenir un bus spécifique
router.get("/:busId", [param("busId").isString().notEmpty()], handleValidationErrors, async (req, res) => {
  try {
    const bus = await Bus.findOne({ busId: req.params.busId }).populate("lineId", "lineId name shortName color route")

    if (!bus) {
      return res.status(404).json({
        error: "Bus non trouvé",
        message: `Le bus ${req.params.busId} n'existe pas`,
      })
    }

    res.json(bus)
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

// POST /api/buses - Créer un nouveau bus (authentification requise)
router.post(
  "/",
  authenticateToken,
  [
    body("busId").isString().notEmpty(),
    body("lineId").isString().notEmpty(),
    body("currentStop").isString().notEmpty(),
    body("nextStop").isString().notEmpty(),
    body("destination").isString().notEmpty(),
    body("location.latitude").isFloat({ min: -90, max: 90 }),
    body("location.longitude").isFloat({ min: -180, max: 180 }),
    body("estimatedArrival").isISO8601(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Vérifier que la ligne existe
      const line = await Line.findOne({ lineId: req.body.lineId })
      if (!line) {
        return res.status(400).json({
          error: "Ligne invalide",
          message: `La ligne ${req.body.lineId} n'existe pas`,
        })
      }

      const busData = {
        ...req.body,
        lineId: line._id,
      }

      const bus = new Bus(busData)
      await bus.save()

      const populatedBus = await Bus.findById(bus._id).populate("lineId", "lineId name shortName color")

      res.status(201).json(populatedBus)
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          error: "Bus déjà existant",
          message: `Le bus ${req.body.busId} existe déjà`,
        })
      }
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// PUT /api/buses/:busId - Mettre à jour un bus
router.put(
  "/:busId",
  authenticateToken,
  [
    param("busId").isString().notEmpty(),
    body("location.latitude").optional().isFloat({ min: -90, max: 90 }),
    body("location.longitude").optional().isFloat({ min: -180, max: 180 }),
    body("speed").optional().isFloat({ min: 0 }),
    body("delay").optional().isInt(),
    body("occupancy.percentage").optional().isInt({ min: 0, max: 100 }),
    body("status").optional().isIn(["active", "inactive", "maintenance"]),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const bus = await Bus.findOneAndUpdate(
        { busId: req.params.busId },
        { ...req.body, lastUpdated: new Date() },
        { new: true, runValidators: true },
      ).populate("lineId", "lineId name shortName color")

      if (!bus) {
        return res.status(404).json({
          error: "Bus non trouvé",
          message: `Le bus ${req.params.busId} n'existe pas`,
        })
      }

      res.json(bus)
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// DELETE /api/buses/:busId - Supprimer un bus
router.delete(
  "/:busId",
  authenticateToken,
  [param("busId").isString().notEmpty()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const bus = await Bus.findOneAndDelete({ busId: req.params.busId })

      if (!bus) {
        return res.status(404).json({
          error: "Bus non trouvé",
          message: `Le bus ${req.params.busId} n'existe pas`,
        })
      }

      res.json({
        message: "Bus supprimé avec succès",
        busId: req.params.busId,
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// GET /api/buses/:busId/route - Obtenir l'itinéraire d'un bus
router.get("/:busId/route", [param("busId").isString().notEmpty()], handleValidationErrors, async (req, res) => {
  try {
    const bus = await Bus.findOne({ busId: req.params.busId }).populate("lineId", "route")

    if (!bus) {
      return res.status(404).json({
        error: "Bus non trouvé",
      })
    }

    res.json({
      busId: bus.busId,
      currentRoute: bus.route,
      lineRoute: bus.lineId.route,
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

// POST /api/buses/:busId/location - Mettre à jour la position d'un bus
router.post(
  "/:busId/location",
  authenticateToken,
  [
    param("busId").isString().notEmpty(),
    body("latitude").isFloat({ min: -90, max: 90 }),
    body("longitude").isFloat({ min: -180, max: 180 }),
    body("speed").optional().isFloat({ min: 0 }),
    body("direction").optional().isFloat({ min: 0, max: 360 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { latitude, longitude, speed, direction } = req.body

      const bus = await Bus.findOne({ busId: req.params.busId })
      if (!bus) {
        return res.status(404).json({
          error: "Bus non trouvé",
        })
      }

      await bus.updateLocation(latitude, longitude, speed, direction)

      res.json({
        message: "Position mise à jour",
        location: bus.location,
        lastUpdated: bus.lastUpdated,
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
