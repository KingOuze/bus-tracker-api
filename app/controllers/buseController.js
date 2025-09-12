const Bus = require('../models/Bus');
const redisClient = require('../config/redis');
const { validationResult } = require('express-validator');

class BusController {

  // Créer un bus
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const busData = req.body;
      const bus = new Bus(busData);
      await bus.save();

      await redisClient.del(`buses_${req.user.company}`);
      return res.status(201).json(bus);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Liste des bus avec pagination
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const cacheKey = `buses_${req.user.company}_page${page}_limit${limit}`;
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) return res.json(JSON.parse(cachedData));

      const filter = { company: req.user.company };
      const buses = await Bus.find(filter)
        .populate('currentLine')
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Bus.countDocuments(filter);

      const response = {
        data: buses,
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

  // Obtenir un bus par ID
  async getById(req, res) {
    try {
      const bus = await Bus.findById(req.params.id).populate('currentLine');
      if (!bus) return res.status(404).json({ message: 'Bus non trouvé' });
      return res.json(bus);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Mise à jour d’un bus
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!bus) return res.status(404).json({ message: 'Bus non trouvé' });

      await redisClient.del(`buses_${req.user.company}`);
      return res.json(bus);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Supprimer un bus
  async delete(req, res) {
    try {
      const bus = await Bus.findByIdAndDelete(req.params.id);
      if (!bus) return res.status(404).json({ message: 'Bus non trouvé' });

      await redisClient.del(`buses_${req.user.company}`);
      return res.json({ message: 'Bus supprimé' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = new BusController();
