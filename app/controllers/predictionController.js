const Prediction = require('../models/Prediction');
const PredictionService = require('../services/PredictionService');
const redisClient = require('../config/redis');

class PredictionController {
  constructor() {
    this.predictionService = new PredictionService();
  }

  // Récupérer toutes les prédictions avec pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const cacheKey = `predictions_${req.user.company}_page${page}_limit${limit}`;
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) return res.json(JSON.parse(cachedData));

      const filter = {}; // ici tu peux filtrer par bus ou ligne si tu veux
      // Ex: filter.lineId = { $in: req.user.companyLines }

      const predictions = await Prediction.find(filter)
        .populate('busId lineId stopId')
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Prediction.countDocuments(filter);

      const response = {
        data: predictions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      await redisClient.setEx(cacheKey, 60, JSON.stringify(response));

      return res.json(response);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Obtenir une prédiction par ID
  async getById(req, res) {
    try {
      const prediction = await Prediction.findById(req.params.id)
        .populate('busId lineId stopId');
      if (!prediction) return res.status(404).json({ message: 'Prédiction non trouvée' });
      return res.json(prediction);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Générer automatiquement des prédictions pour tous les bus actifs
  async generate(req, res) {
    try {
      await this.predictionService.generatePredictions();
      return res.json({ message: 'Prédictions générées avec succès' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Statistiques de performance des algorithmes
  async performanceStats(req, res) {
    try {
      const stats = await this.predictionService.getPerformanceStats();
      return res.json(stats);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = new PredictionController();
