const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const {authenticateToken, requireRole} = require("../middlewares/auth");

router.use(authenticateToken); // Authentification
router.use(requireRole(['admin', 'superAdmin'])); // Autorisation

// Créer une compagnie
router.post('/', companyController.createCompany);

// Récupérer toutes les compagnies
router.get('/', companyController.getCompanies);

// Récupérer une compagnie par ID
router.get('/:id', companyController.getCompanyById);

// Mettre à jour une compagnie
router.put('/:id', companyController.updateCompany);

// Supprimer une compagnie
router.delete('/:id', companyController.deleteCompany);

//switcher le status du compagnie
router.patch('/:id/status', companyController.toggleCompanyStatus);

module.exports = router;
