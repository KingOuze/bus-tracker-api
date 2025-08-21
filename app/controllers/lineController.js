// controllers/lineController.js
const Line = require("../models/Line")
const Stop = require("../models/Stop")


// Créer une ligne
exports.createLine = async (req, res) => {
    try {
      const line = new Line(req.body)
      await line.save()
      res.status(201).json(line)
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          error: "Ligne déjà existante",
          message: `La ligne ${req.body.lineId} existe déjà`,
        })
      }
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
},

// Récupérer toutes les lignes
exports.getLines = async (req, res) => {
    try {
      const { status, type, limit = 50, page = 1 } = req.query
      const query = {}

      if (status) query.status = status
      if (type) query.type = type

      const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

      const lines = await Line.find(query).sort({ name: 1 }).limit(Number.parseInt(limit)).skip(skip)

      const total = await Line.countDocuments(query)

      res.json({
        lines,
        pagination: {
          current: Number.parseInt(page),
          total: Math.ceil(total / Number.parseInt(limit)),
          count: lines.length,
          totalLines: total,
        },
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
},

// Récupérer une ligne par ID
exports.getLineById = async (req, res) => {
  try {
    const line = await Line.findOne({ _id: req.params.lineId })

    if (!line) {
      return res.status(404).json({
        error: "Ligne non trouvée",
        message: `La ligne ${req.params.lineId} n'existe pas`,
      })
    }

    res.status(200).json(line)
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
}

// Mettre à jour une ligne
exports.updateLine = async (req, res) => {
    try {
      const _id = req.params.lineId
      if (!_id) {
        return res.status(400).json({
          error: "ID de ligne requis",
          message: "Veuillez fournir un ID de ligne valide",
        })
      }
      const line = await Line.findOneAndUpdate({ _id: _id }, req.body, {
        new: true,
        runValidators: true,
      })

      if (!line) {
        return res.status(404).json({
          error: "Ligne non trouvée",
          message: `La ligne ${req.params.lineId} n'existe pas`,
        })
      }

      res.status(200).json(line)
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },

// Supprimer une ligne
exports.deleteLine = async (req, res) => {
  try {
    const line = await Line.findById(req.params.lineId)
    if (!line) {    
        return res.status(404).json({ error: "Ligne non trouvée" })
    }
    // Supprimer les références de la ligne dans les arrêts
    await Stop.updateMany( 
        { _id: { $in: line.stops } },
        { $pull: { lines: line._id } }
        )   
        
    await Line.findByIdAndDelete(req.params.id)
    res.json({ message: "Ligne supprimée" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Ajouter un arrêt à une ligne
exports.addStopToLine = async (req, res) => {
  try {
    const { lineId, stopId } = req.body

    const line = await Line.findById(lineId)
    const stop = await Stop.findById(stopId)

    if (!line || !stop) {
      return res.status(404).json({ error: "Ligne ou arrêt introuvable" })
    }

    // Éviter les doublons
    if (!line.stops.includes(stop._id)) {
      line.stops.push(stop._id)
      await line.save()
    }

    if (!stop.lines.includes(line._id)) {
      stop.lines.push(line._id)
      await stop.save()
    }

    res.json({ message: "Arrêt ajouté à la ligne", line, stop })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Retirer un arrêt d’une ligne
exports.removeStopFromLine = async (req, res) => {
  try {
    const { lineId, stopId } = req.body

    const line = await Line.findById(lineId)
    const stop = await Stop.findById(stopId)

    if (!line || !stop) {
      return res.status(404).json({ error: "Ligne ou arrêt introuvable" })
    }

    line.stops = line.stops.filter((s) => s.toString() !== stopId)
    await line.save()

    stop.lines = stop.lines.filter((l) => l.toString() !== lineId)
    await stop.save()

    res.json({ message: "Arrêt retiré de la ligne", line, stop })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Obtenir les arrêts d'une ligne
exports.getStopsByLine = async (req, res) => {
  try {
    const line = await Line.findById(req.params.lineId).populate("stops")

    if (!line) {
      return res.status(404).json({
        error: "Ligne non trouvée",
        message: `La ligne ${req.params.lineId} n'existe pas`,
      })
    }

    res.json(line.stops)
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
}
