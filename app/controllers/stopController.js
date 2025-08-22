// controllers/stopController.js
const Stop = require("../models/Stop")

// Créer un arrêt
exports.createStop = async (req, res) => {
  try {
    const stop = new Stop(req.body)
    console.log("Creating stop:", stop)
    await stop.save()
    res.status(201).json(stop)
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err })
  }
}

// Récupérer tous les arrêts
exports.getStops = async (req, res) => {
  try {
    const stops = await Stop.find().populate("lines")
    res.json({stops})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Récupérer un arrêt par ID
exports.getStopById = async (req, res) => {
  try {
    const stop = await Stop.findById(req.params.id).populate("lines")
    if (!stop) return res.status(404).json({ error: "Arrêt introuvable" })
    res.json(stop)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Mettre à jour un arrêt
exports.updateStop = async (req, res) => {
  try {
    const stop = await Stop.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!stop) return res.status(404).json({ error: "Arrêt introuvable" })
    res.json(stop)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

// Supprimer un arrêt
exports.deleteStop = async (req, res) => {
  try {
    await Stop.findByIdAndDelete(req.params.id)
    res.json({ message: "Arrêt supprimé" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.addLinesToStop = async (req, res) => {
  try {
    const { lines } = req.body
    const stop = await Stop.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { lines: { $each: lines } } },
      { new: true }
    ).populate("lines")
    if (!stop) return res.status(404).json({ error: "Arrêt introuvable" })
    res.json(stop)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

exports.removeLinesFromStop = async (req, res) => {
  try {
    const { lines } = req.body
    const stop = await Stop.findByIdAndUpdate(
      req.params.id,
      { $pull: { lines: { $in: lines } } },
      { new: true }
    ).populate("lines")
    if (!stop) return res.status(404).json({ error: "Arrêt introuvable" })
    res.json(stop)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}
