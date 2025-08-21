const express = require("express")
const { body, query, param } = require("express-validator")
const { handleValidationErrors } = require("../middleware/handleValidationResult")
const { authenticateToken, authorizeRoles } = require("../middleware/auth")
const { createLine, 
        getLines, 
        getLineById, 
        updateLine, 
        deleteLine, 
        getStopsByLine, 
        addStopToLine, 
        removeStopFromLine } = require("../controllers/lineController")

const router = express.Router()


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
  getLines,
)

// GET /api/lines/:lineId - Obtenir une ligne spécifique
router.get("/:lineId", [param("lineId").isString().notEmpty()], handleValidationErrors, getLineById)

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
    body("company").isString().notEmpty().withMessage("La compagnie est requise"),
  ],
  handleValidationErrors,
  createLine)

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
    body("company").optional().isString().notEmpty(),
  ],
  handleValidationErrors,
  updateLine,
)

// DELETE /api/lines/:lineId - Supprimer une ligne (Admin requis)
router.delete(
  "/:lineId",
  authenticateToken,
  authorizeRoles("admin"),
  [param("lineId").isString().notEmpty()],
  handleValidationErrors,
  deleteLine
)


// GET /api/lines/:lineId/stops - Obtenir les arrêts d'une ligne
router.get("/:lineId/stops", [param("lineId").isString().notEmpty()], handleValidationErrors, getStopsByLine)

//assigner des arrêts à une lign
router.post(
  "/:lineId/stops",
  authenticateToken,
  authorizeRoles("admin", "operator"),
  [
    param("lineId").isString().notEmpty(),
    body("stopIds").isArray().withMessage("stopIds doit être un tableau d'IDs d'arrêts"),
    body("stopIds.*").isString().notEmpty().withMessage("Chaque ID d'arrêt doit être une chaîne non vide"),
  ],
  handleValidationErrors,
  addStopToLine
)

// DELETE /api/lines/:lineId/stops - Supprimer des arrêts d'une ligne
router.delete(
  "/:lineId/stops",
  authenticateToken,
  authorizeRoles("admin", "operator"),
  [
    param("lineId").isString().notEmpty(),
    body("stopIds").isArray().withMessage("stopIds doit être un tableau d'IDs d'arrêts"),
    body("stopIds.*").isString().notEmpty().withMessage("Chaque ID d'arrêt doit être une chaîne non vide"),
  ],
  handleValidationErrors,
  removeStopFromLine
)

module.exports = router
