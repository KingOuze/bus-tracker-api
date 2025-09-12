const Line = require('../models/Line');
const redisClient = require('../config/redis'); // Assurez-vous que Redis est configuré
const { validationResult } = require('express-validator');

class LineController {

  // Créer une ligne
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, number, shortName, color, startStop, endStop, totalStops, distance, duration, frequency, assignedBuses, stops, schedule } = req.body;

      const line = new Line({
        name, number, shortName, color, startStop, endStop,
        totalStops, distance, duration, frequency,
        assignedBuses, stops, schedule
      });

      await line.save();
      // Supprimer le cache lié aux lignes
      await redisClient.del(`lines_${req.user.company}`);

      return res.status(201).json(line);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Récupérer toutes les lignes (avec cache Redis)
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const cacheKey = `lines_${req.user.company}_page${page}_limit${limit}`;
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      const filter = {}; // Filtrer selon la compagnie si besoin
      // Si tu as une référence à la compagnie dans Line, ajouter: filter.company = req.user.company;

      const lines = await Line.find(filter)
        .populate('startStop endStop assignedBuses stops.stop')
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Line.countDocuments(filter);

      const response = {
        data: lines,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

      await redisClient.setEx(cacheKey, 60, JSON.stringify(response)); // Cache 60 secondes

      return res.json(response);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Récupérer une ligne par ID
  async getById(req, res) {
    try {
      const line = await Line.findById(req.params.id)
        .populate('startStop endStop assignedBuses stops.stop');

      if (!line) return res.status(404).json({ message: 'Ligne non trouvée' });

      return res.json(line);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Mettre à jour une ligne
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const line = await Line.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!line) return res.status(404).json({ message: 'Ligne non trouvée' });

      // Supprimer le cache lié aux lignes
      await redisClient.del(`lines_${req.user.company}`);

      return res.json(line);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Supprimer une ligne
  async delete(req, res) {
    try {
      const line = await Line.findByIdAndDelete(req.params.id);
      if (!line) return res.status(404).json({ message: 'Ligne non trouvée' });

      // Supprimer le cache lié aux lignes
      await redisClient.del(`lines_${req.user.company}`);

      return res.json({ message: 'Ligne supprimée' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = new LineController();
