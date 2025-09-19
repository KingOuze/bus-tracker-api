const Company = require('../models/Company');

/**
 * @desc Créer une nouvelle compagnie
 */
exports.createCompany = async (req, res) => {
  try {
    const company = new Company(req.body);
    await company.save();
    res.status(201).json(company);
  } catch (error) {
    res.status(400).json({ message: "Erreur lors de la création de la compagnie", error: error.message });
  }
};

/**
 * @desc Récupérer toutes les compagnies (avec filtres et pagination)
 */
exports.getCompanies = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) query.$text = { $search: search };

    const companies = await Company.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Company.countDocuments(query);

    res.json({
      data: companies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des compagnies", error: error.message });
  }
};

/**
 * @desc Récupérer une compagnie par ID
 */
exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Compagnie non trouvée" });
    }

    res.json(company);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de la compagnie", error: error.message });
  }
};

/**
 * @desc Mettre à jour une compagnie
 */
exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!company) {
      return res.status(404).json({ message: "Compagnie non trouvée" });
    }

    res.json(company);
  } catch (error) {
    res.status(400).json({ message: "Erreur lors de la mise à jour de la compagnie", error: error.message });
  }
};

/**
 * @desc Supprimer une compagnie
 */
exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ message: "Compagnie non trouvée" });
    }

    res.json({ message: "Compagnie supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression de la compagnie", error: error.message });
  }
};

/**
 * @desc Switch le status d'une compagnie
 */
exports.toggleCompanyStatus = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Compagnie non trouvée" });
    }

    if(req.user.role !== 'superAdmin' && company._id.toString() !== req.user.company.toString()) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    company.status = company.status === 'active' ? 'inactive' : 'active';
    await company.save();
    res.json({ message: "Status de la compagnie mis à jour", status: company.status });
  } 
  catch (error) {
    return res.status(500).json({ message: "Erreur lors de la mise à jour du status de la compagnie", error: error.message });
  }
}
