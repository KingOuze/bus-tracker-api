const express = require("express")
const { authenticateToken } = require("../middlewares/auth") 
const router = express.Router();
const StopController = require("../controllers/StopController");
const { body, param } = require('express-validator');
const passport = require('../config/passport');
const { requireRole } = require("../middlewares/auth");
const requireAuth = passport.authenticate('jwt', { session: false });

router.use(authenticateToken);



// Création d'un arrêt
router.post(
  '/',
  [
    body('name').isString().notEmpty(),
    body('code').isString().notEmpty(),
    body('address').isString().notEmpty(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('zone').isString().notEmpty(),
    body('status').optional().isIn(['active', 'maintenance', 'inactive']),
    body('lines').optional().isArray(),
    body('dailyPassengers').optional().isInt({ min: 0 }),
    body('accessibility').optional().isBoolean(),
    body('amenities').optional().isArray(),
    body('capacity').optional().isInt({ min: 0 })
  ],
  StopController.create
);

// Liste des arrêts avec pagination
router.get('/', StopController.getAll);

// Obtenir un arrêt par ID
router.get('/:id', param('id').isMongoId(), StopController.getById);

// Mise à jour
router.put('/:id', param('id').isMongoId(), StopController.update);

// Suppression
router.delete('/:id', param('id').isMongoId(), StopController.delete);

module.exports = router;
