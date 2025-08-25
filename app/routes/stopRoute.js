const express = require("express")
const { body, query, param } = require("express-validator")
const { handleValidationErrors } = require("../middleware/handleValidationResult")
const { authenticateToken, authorizeRoles } = require("../middleware/auth") 
const { createStop, 
        getStops, 
        getStopById, 
        updateStop,
        deleteStop } = require("../controllers/stopController")

const router = express.Router()

// GET /api/stops - Obtenir tous les arrêts
router.get(
  "/",
  [
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("page").optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  getStops,
)

// GET /api/stops/:id - Obtenir un arrêt spécifique
router.get(
  "/:id",
  [param("id").isString().notEmpty()],
  handleValidationErrors,
  getStopById,
)

// POST /api/stops - Créer un nouvel arrêt (Admin/Operator requis)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "operator"),
  [
    body("name").isString().notEmpty().withMessage("Le nom de l'arrêt est requis"),
    body("address").isString().notEmpty().withMessage("L'adresse de l'arrêt est requise"),
    body("latitude").isFloat({ min: -90, max: 90 }).withMessage("Latitude invalide"),
    body("longitude").isFloat({ min: -180, max: 180 }).withMessage("Longitude invalide"),
    body("status").optional().isString().isIn(["active", "inactive"]).withMessage("Statut invalide"),
  ],
  handleValidationErrors,
  createStop,
)

// PUT /api/stops/:id - Mettre à jour un arrêt (Admin/Operator requis)
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "operator"),
  [
    param("id").isString().notEmpty(),
    body("name").optional().isString().notEmpty(),
    body("status").optional().isString().isIn(["active", "inactive"]),
    body("address").optional().isString().notEmpty(),
    body("latitude").optional().isFloat({ min: -90, max: 90 }),
    body("longitude").optional().isFloat({ min: -180, max: 180 }),
  ],
  handleValidationErrors,
  updateStop,
)

// DELETE /api/stops/:id - Supprimer un arrêt (Admin/Operator requis)
router.delete( 
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "operator"),
    [param("id").isString().notEmpty()],
    handleValidationErrors,
    deleteStop)


module.exports = router