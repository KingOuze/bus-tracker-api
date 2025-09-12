const Alert = require('../models/Alert');
const redisClient = require('../config/redis');
const { validationResult } = require('express-validator');

class AlertController {

  // Créer une alerte
  static async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const alertData = { ...req.body, createdBy: req.user._id };
      
      const alert = await Alert.create(alertData);

      // Invalider le cache
      if (req.user.company) await redisClient.del(`alerts:${req.user.company}`);

      res.status(201).json({ message: 'Alerte créée', data: alert });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la création de l’alerte', error });
    }
  }

  // Récupérer toutes les alertes avec pagination + cache
  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status;

      const cacheKey = `alerts:${req.user.company}:page:${page}:limit:${limit}:status:${status || 'all'}`;
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) return res.json(JSON.parse(cachedData));

      const query = {};
      if (req.user.company) query['createdBy.company'] = req.user.company; // filtrage par company
      if (status) query.status = status;

      const alerts = await Alert.find(query)
        .populate('affectedLines affectedStops affectedBuses createdBy resolvedBy')
        .sort({ startTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Alert.countDocuments(query);

      const result = { total, page, limit, data: alerts };

      await redisClient.setEx(cacheKey, 300, JSON.stringify(result));

      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la récupération des alertes', error });
    }
  }

  // Récupérer une alerte par ID
  static async getById(req, res) {
    try {
      const alert = await Alert.findOne({ _id: req.params.id })
        .populate('affectedLines affectedStops affectedBuses createdBy resolvedBy');

      if (!alert) return res.status(404).json({ message: 'Alerte non trouvée' });

      // Vérifier que l'alerte appartient à la compagnie
      if (req.user.company && alert.createdBy.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({ message: 'Accès refusé' });
      }

      res.json(alert);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la récupération de l’alerte', error });
    }
  }

  // Mettre à jour une alerte
  static async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const alert = await Alert.findOneAndUpdate(
        { _id: req.params.id },
        req.body,
        { new: true }
      );

      if (!alert) return res.status(404).json({ message: 'Alerte non trouvée' });

      // Vérifier la compagnie
      if (req.user.company && alert.createdBy.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({ message: 'Accès refusé' });
      }

      // Invalider cache
      await redisClient.del(`alerts:${req.user.company}`);

      res.json({ message: 'Alerte mise à jour', data: alert });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour de l’alerte', error });
    }
  }

  // Supprimer une alerte
  static async delete(req, res) {
    try {
      const alert = await Alert.findOneAndDelete({ _id: req.params.id });

      if (!alert) return res.status(404).json({ message: 'Alerte non trouvée' });

      if (req.user.company && alert.createdBy.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({ message: 'Accès refusé' });
      }

      // Invalider cache
      await redisClient.del(`alerts:${req.user.company}`);

      res.json({ message: 'Alerte supprimée' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la suppression de l’alerte', error });
    }
  }
}

module.exports = AlertController;

