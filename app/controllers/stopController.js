const Stop = require('../models/Stop');
const redisClient = require('../config/redis'); // ton client Redis
const { validationResult } = require('express-validator');

class StopController {

  // Créer un arrêt
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const stopData = req.body;

      const stop = new Stop(stopData);
      await stop.save();

      // Supprimer le cache lié aux stops
      await redisClient.del(`stops_${req.user.company}`);

      return res.status(201).json(stop);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Liste des arrêts avec pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const cacheKey = `stops_${req.user.company}_page${page}_limit${limit}`;
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) return res.json(JSON.parse(cachedData));

      const filter = {}; 
      // Si tu as une référence à la compagnie dans Stop, ajouter : filter.company = req.user.company;

      const stops = await Stop.find(filter)
        .populate('lines')
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Stop.countDocuments(filter);

      const response = {
        data: stops,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      await redisClient.setEx(cacheKey, 60, JSON.stringify(response)); // cache 60s

      return res.json(response);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Obtenir un arrêt par ID
  async getById(req, res) {
    try {
      const stop = await Stop.findById(req.params.id).populate('lines');
      if (!stop) return res.status(404).json({ message: 'Arrêt non trouvé' });
      return res.json(stop);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Mettre à jour un arrêt
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const stop = await Stop.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!stop) return res.status(404).json({ message: 'Arrêt non trouvé' });

      // Supprimer le cache lié aux stops
      await redisClient.del(`stops_${req.user.company}`);

      return res.json(stop);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Supprimer un arrêt
  async delete(req, res) {
    try {
      const stop = await Stop.findByIdAndDelete(req.params.id);
      if (!stop) return res.status(404).json({ message: 'Arrêt non trouvé' });

      // Supprimer le cache lié aux stops
      await redisClient.del(`stops_${req.user.company}`);

      return res.json({ message: 'Arrêt supprimé' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = new StopController();
