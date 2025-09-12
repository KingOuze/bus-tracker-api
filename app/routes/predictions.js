const express = require("express")
const { authenticateToken } = require("../middlewares/auth")
const router = express.Router();
const PredictionController = require("../controllers/predictionController");
const { body, param, query } = require('express-validator');
const checkPermission = require('../middlewares/permissionMiddleware');

router.use(authenticateToken);

// Toutes les routes nécessitent l'authentification

// Récupérer toutes les prédictions avec pagination et filtre
router.get(
  '/',
  checkPermission('view_predictions'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('lineId').optional().isMongoId(),
    query('busId').optional().isMongoId(),
    query('predictionType').optional().isIn(['arrival', 'delay', 'occupancy', 'disruption'])
  ],
  PredictionController.getAll
);

// Récupérer une prédiction par ID
router.get(
  '/:id',
  checkPermission('view_predictions'),
  [
    param('id').isMongoId().withMessage('ID de prédiction invalide')
  ],
  PredictionController.getById
);


module.exports = router;
