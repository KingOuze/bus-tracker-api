const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
// const { authenticate, authorize } = require('../middlewares/permissionMiddleware'); // si tu veux restreindre

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

module.exports = router;
