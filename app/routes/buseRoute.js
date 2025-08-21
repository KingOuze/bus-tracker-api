const express = require("express")
const { body, query, param } = require("express-validator")
const { handleValidationErrors } = require("../middleware/handleValidationResult")
const { authenticateToken } = require("../middleware/auth")
const buseController = require("../controllers/buseController")

const {
        getBuses,
        getBusById,
        createBus,
        updateBus,
        deleteBus,
        getBusRoute,
        updateBusLocation,
      } = buseController

const router = express.Router()

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
  getBuses
)

// GET /api/buses/:busId - Obtenir un bus spécifique
router.get("/:busId", [param("busId").isString().notEmpty()], handleValidationErrors, getBusById)

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
  createBus,
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
  updateBus,
)

// DELETE /api/buses/:busId - Supprimer un bus
router.delete(
  "/:busId",
  authenticateToken,
  [param("busId").isString().notEmpty()],
  handleValidationErrors,
  deleteBus,
)

// GET /api/buses/:busId/route - Obtenir l'itinéraire d'un bus
router.get("/:busId/route", [param("busId").isString().notEmpty()], handleValidationErrors, getBusRoute)

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
  updateBusLocation,
)

module.exports = router
