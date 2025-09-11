const express = require("express")
const { body, query, param } = require("express-validator")
const { authenticateToken } = require("../middlewares/auth")

const router = express.Router()
const AlertController = require('../controllers/alertController');

// Middleware d'authentification sur toutes les routes
router.use(authenticateToken);

// Création d'une alerte
router.post(
  '/',
  [
    body('type').isIn(['info', 'warning', 'error', 'success', 'maintenance', 'disruption']).withMessage('Type invalide'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Sévérité invalide'),
    body('title').isString().isLength({ min: 3, max: 200 }).withMessage('Titre invalide'),
    body('message').isString().isLength({ min: 3, max: 1000 }).withMessage('Message invalide'),
    body('category').isIn(['delay','cancellation','route_change','technical','weather','traffic','event']).withMessage('Catégorie invalide'),
    body('priority').optional().isInt({ min: 1, max: 10 }),
    body('status').optional().isIn(['active', 'investigating', 'resolved', 'closed']),
    body('affectedLines').optional().isArray(),
    body('affectedStops').optional().isArray(),
    body('affectedBuses').optional().isArray(),
    body('location.latitude').optional().isFloat({ min: -90, max: 90 }),
    body('location.longitude').optional().isFloat({ min: -180, max: 180 }),
    body('location.radius').optional().isInt({ min: 0 }),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('estimatedDuration').optional().isInt({ min: 0 }),
    body('impact.delayMinutes').optional().isInt({ min: 0 }),
    body('impact.affectedPassengers').optional().isInt({ min: 0 }),
    body('impact.alternativeRoutes').optional().isArray()
  ],
  AlertController.create
);

// Récupérer toutes les alertes
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'investigating', 'resolved', 'closed'])
  ],
  AlertController.getAll
);

// Récupérer une alerte par ID
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  AlertController.getById
);

// Mise à jour d'une alerte
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('ID invalide'),
    body('type').optional().isIn(['info', 'warning', 'error', 'success', 'maintenance', 'disruption']),
    body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('title').optional().isString().isLength({ min: 3, max: 200 }),
    body('message').optional().isString().isLength({ min: 3, max: 1000 }),
    body('category').optional().isIn(['delay','cancellation','route_change','technical','weather','traffic','event']),
    body('priority').optional().isInt({ min: 1, max: 10 }),
    body('status').optional().isIn(['active', 'investigating', 'resolved', 'closed']),
    body('affectedLines').optional().isArray(),
    body('affectedStops').optional().isArray(),
    body('affectedBuses').optional().isArray(),
    body('location.latitude').optional().isFloat({ min: -90, max: 90 }),
    body('location.longitude').optional().isFloat({ min: -180, max: 180 }),
    body('location.radius').optional().isInt({ min: 0 }),
    body('startTime').optional().isISO8601(),
    body('endTime').optional().isISO8601(),
    body('estimatedDuration').optional().isInt({ min: 0 }),
    body('impact.delayMinutes').optional().isInt({ min: 0 }),
    body('impact.affectedPassengers').optional().isInt({ min: 0 }),
    body('impact.alternativeRoutes').optional().isArray()
  ],
  AlertController.update
);

// Supprimer une alerte
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('ID invalide')],
  AlertController.delete
);

module.exports = router;
