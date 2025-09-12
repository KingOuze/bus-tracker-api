const express = require("express")
const { authenticateToken } = require("../middlewares/auth")
const router = express.Router();
const LineController = require("../controllers/lineController");
const { body, param } = require('express-validator');


router.use(authenticateToken);


// Création
router.post(
  '/',
  [
    body('name').isString().notEmpty(),
    body('number').isString().notEmpty(),
    body('color').matches(/^#[0-9A-F]{6}$/i),
    body('startStop').isMongoId(),
    body('endStop').isMongoId(),
    body('totalStops').isInt({ min: 2 }),
    body('distance').isFloat({ min: 0 }),
    body('duration').isInt({ min: 1 }),
    body('frequency').isInt({ min: 1 })
  ],
  LineController.create
);

// Liste des lignes avec pagination
router.get('/', LineController.getAll);

// Ligne par ID
router.get('/:id', param('id').isMongoId(), LineController.getById);

// Mise à jour
router.put('/:id', param('id').isMongoId(), LineController.update);

// Suppression
router.delete('/:id', param('id').isMongoId(), LineController.delete);

module.exports = router;

