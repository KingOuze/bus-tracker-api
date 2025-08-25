// controllers/lineController.js
const Line = require("../models/Line")
const Stop = require("../models/Stop")
const LineStop = require("../models/LineStop")


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
    const { direction } = req.query
    if (!["go", "return"].includes(direction)) {
      return res.status(400).json({ error: "Direction invalide. Utilisez 'go' ou 'return'." })
    }

    const { lineId, stopId, order } = req.body;
    const line = await Line.findById(lineId)
    const stop = await Stop.findById(stopId)

    if (!line || !stop) {
      return res.status(404).json({ error: "Ligne ou arrêt introuvable" })
    }

    // Éviter les doublons
     const lineStop = await LineStop.findOne({ lineId: lineId, stopId: stopId, direction: direction })
    if (lineStop) {
        return res.status(400).json({ error: "L'arrêt est déjà assigné à cette ligne" })
    }
    
  
    const newLineStop = new LineStop({ lineId: lineId, stopId: stopId, order: order, direction: direction })
    await newLineStop.save()

    res.json({ message: "Arrêt ajouté à la ligne", newLineStop })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Retirer un arrêt d’une ligne
exports.removeStopFromLine = async (req, res) => {
  try {
    const { direction } = req.query;
    const { lineId, stopId } = req.body;

    const line = await Line.findById(lineId);
    const stop = await Stop.findById(stopId);

    if (!line || !stop) {
      return res.status(404).json({ error: "Ligne ou arrêt introuvable" });
    }

    const lineStop = await LineStop.findOne({ lineId, stopId, direction });
    if (!lineStop) {
      return res.status(400).json({ error: "L'arrêt n'est pas assigné à cette ligne" });
    }

    await LineStop.deleteOne({ lineId, stopId, direction });

    res.json({ message: "Arrêt retiré de la ligne" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Obtenir les arrêts d'une ligne classés par direction
exports.getStopsByLine = async (req, res) => {
  try {
    const line = await Line.findById(req.params.lineId)
    if (!line) {
      return res.status(404).json({ error: "Ligne non trouvée" })
    }

    // Récupérer les LineStops (avec direction et ordre)
    console.log("line id: " + line._id)
    const lineStops = await LineStop.find({ lineId: line._id })
      .populate("stopId") // ramène les détails du Stop
      .sort({ order: 1 }) // trie par ordre croissant

      console.log(lineStops)
    if (!lineStops || lineStops.length === 0) {
      return res.status(404).json({ error: "Aucun arrêt trouvé pour cette ligne" })
    }

    // Séparer en deux listes : "go" et "return"
    const goStops = lineStops
      .filter(ls => ls.direction === "go")
      .map(ls => ({
        ...ls.stopId.toObject(),
        order: ls.order,
      }))

    const returnStops = lineStops
      .filter(ls => ls.direction === "return")
      .map(ls => ({
        ...ls.stopId.toObject(),
        order: ls.order,
      }))

    res.json({
      stops : {
        go: goStops,
        return: returnStops,
      }
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
}

// Réordonner les arrêts d'une ligne
exports.reorderStops = async (req, res) => {
  try {
    const { lineId } = req.params
    const { direction, stops } = req.body

    if (!lineId || !direction || !stops) {
      return res.status(400).json({ error: "lineId, direction et stops sont requis" })
    }

    // Mise à jour en batch des orders
    for (const stop of stops) {
      await LineStop.findOneAndUpdate(
        { lineId, stopId: stop._id, direction },
        { order: stop.order }
      )
    }

    res.json({ message: "Ordre des arrêts mis à jour avec succès" })
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur", message: error.message })
  }
}

