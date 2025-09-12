const express = require("express")
const { body, query, param } = require("express-validator")
const { authenticateToken } = require("../middlewares/auth")
const BusController = require('../controllers/buseController');
const checkPermission = require('../middlewares/permissionMiddleware');
const passport = require('../config/passport');
const { requireRole } = require("../middlewares/auth");
const requireAuth = passport.authenticate('jwt', { session: false });


const router = express.Router();

// Middleware pour sécuriser toutes les routes
router.use(authenticateToken);

// Créer un bus
router.post(
  '/',
  checkPermission('manage_buses'),
  [
    body('busNumber').notEmpty().withMessage('Le numéro du bus est requis'),
    body('licensePlate').notEmpty().withMessage('La plaque d\'immatriculation est requise'),
    body('model').notEmpty().withMessage('Le modèle du bus est requis'),
    body('capacity').isInt({ min: 1 }).withMessage('La capacité doit être un nombre positif'),
    body('status').optional().isIn(['active', 'maintenance', 'inactive']),
    body('currentLine').notEmpty().withMessage('La ligne du bus est requise'),
    body('driver').optional().isString()
  ],
  BusController.create
);

// Récupérer tous les bus avec pagination et filtre
router.get(
  '/',
  checkPermission('view_buses'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  BusController.getAll
);

// Récupérer un bus par ID
router.get(
  '/:id',
  checkPermission('view_buses'),
  [
    param('id').isMongoId().withMessage('ID de bus invalide')
  ],
  BusController.getById
);

// Mettre à jour un bus
router.put(
  '/:id',
  checkPermission('manage_buses'),
  [
    param('id').isMongoId().withMessage('ID de bus invalide'),
    body('busNumber').optional().notEmpty(),
    body('licensePlate').optional().notEmpty(),
    body('model').optional().notEmpty(),
    body('capacity').optional().isInt({ min: 1 }),
    body('status').optional().isIn(['active', 'maintenance', 'inactive']),
    body('currentLine').optional().notEmpty(),
    body('driver').optional().isString()
  ],
  BusController.update
);

// Supprimer un bus
router.delete(
  '/:id',
  checkPermission('manage_buses'),
  [
    param('id').isMongoId().withMessage('ID de bus invalide')
  ],
  BusController.delete
);

module.exports = router;
