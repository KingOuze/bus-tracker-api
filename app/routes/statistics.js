const express = require("express")
const { query, validationResult } = require("express-validator")
const Bus = require("../models/Bus")
const Line = require("../models/Line")
const Alert = require("../models/Alert")
const Prediction = require("../models/Prediction")
const { authenticateToken } = require("../middlewares/auth")

const router = express.Router()

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Données invalides",
      details: errors.array(),
    })
  }
  next()
}

// GET /api/statistics/overview - Statistiques générales du réseau
router.get("/overview", async (req, res) => {
  try {
    const totalBuses = await Bus.countDocuments()
    const activeBuses = await Bus.countDocuments({ status: "active" })
    const delayedBuses = await Bus.countDocuments({ delay: { $gt: 0 } })
    const onTimeBuses = await Bus.countDocuments({ delay: 0 })
    const totalLines = await Line.countDocuments()
    const activeAlerts = await Alert.countDocuments({ status: "active" })

    // Calculer la ponctualité moyenne
    const totalBusUpdates = await Bus.countDocuments()
    const onTimePercentage = totalBusUpdates > 0 ? (onTimeBuses / totalBusUpdates) * 100 : 0

    res.json({
      totalBuses,
      activeBuses,
      delayedBuses,
      onTimeBuses,
      totalLines,
      activeAlerts,
      onTimePerformance: Number.parseFloat(onTimePercentage.toFixed(2)),
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

// GET /api/statistics/line-performance - Performance par ligne
router.get("/line-performance", [query("lineId").optional().isString()], handleValidationErrors, async (req, res) => {
  try {
    const { lineId } = req.query
    const matchQuery = {}
    if (lineId) {
      const lineDoc = await Line.findOne({ lineId: lineId })
      if (lineDoc) {
        matchQuery._id = lineDoc._id
      } else {
        return res.status(404).json({ error: "Ligne non trouvée" })
      }
    }

    const linePerformance = await Line.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "buses",
          localField: "_id",
          foreignField: "lineId",
          as: "buses",
        },
      },
      {
        $project: {
          lineId: "$lineId",
          name: "$name",
          color: "$color",
          totalBuses: { $size: "$buses" },
          activeBuses: {
            $size: {
              $filter: {
                input: "$buses",
                as: "bus",
                cond: { $eq: ["$$bus.status", "active"] },
              },
            },
          },
          onTimeBuses: {
            $size: {
              $filter: {
                input: "$buses",
                as: "bus",
                cond: { $eq: ["$$bus.delay", 0] },
              },
            },
          },
          delayedBuses: {
            $size: {
              $filter: {
                input: "$buses",
                as: "bus",
                cond: { $gt: ["$$bus.delay", 0] },
              },
            },
          },
          averageDelay: { $avg: "$buses.delay" },
          averageOccupancy: { $avg: "$buses.occupancy.percentage" },
        },
      },
    ])

    res.json({
      linePerformance,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

// GET /api/statistics/delay-distribution - Distribution des retards
router.get("/delay-distribution", async (req, res) => {
  try {
    const delayDistribution = await Bus.aggregate([
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$delay", 0] },
              then: "onTime",
              else: {
                $cond: {
                  if: { $and: [{ $gt: ["$delay", 0] }, { $lte: ["$delay", 5] }] },
                  then: "1-5min",
                  else: {
                    $cond: {
                      if: { $and: [{ $gt: ["$delay", 5] }, { $lte: ["$delay", 10] }] },
                      then: "5-10min",
                      else: "+10min",
                    },
                  },
                },
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          count: 1,
        },
      },
      {
        $sort: { category: 1 },
      },
    ])

    const totalBuses = await Bus.countDocuments()
    const formattedDistribution = delayDistribution.map((item) => ({
      ...item,
      percentage: totalBuses > 0 ? Number.parseFloat(((item.count / totalBuses) * 100).toFixed(2)) : 0,
    }))

    res.json({
      delayDistribution: formattedDistribution,
      totalBuses,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

// GET /api/statistics/occupancy-trends - Tendances d'occupation
router.get(
  "/occupancy-trends",
  [
    query("lineId").optional().isString(),
    query("period").optional().isIn(["hour", "day", "week"]).default("hour"),
    query("startDate").optional().isISO8601().toDate(),
    query("endDate").optional().isISO8601().toDate(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { lineId, period, startDate, endDate } = req.query
      const matchQuery = {}

      if (lineId) {
        const lineDoc = await Line.findOne({ lineId: lineId })
        if (lineDoc) {
          matchQuery.lineId = lineDoc._id
        } else {
          return res.status(404).json({ error: "Ligne non trouvée" })
        }
      }

      const now = new Date()
      const start = startDate || new Date(now.setDate(now.getDate() - 1)) // Dernières 24h par défaut
      const end = endDate || new Date()

      matchQuery.lastUpdated = { $gte: start, $lte: end }

      let groupByFormat
      switch (period) {
        case "hour":
          groupByFormat = "%H:00"
          break
        case "day":
          groupByFormat = "%Y-%m-%d"
          break
        case "week":
          groupByFormat = "%Y-%W"
          break
        default:
          groupByFormat = "%H:00"
      }

      const occupancyTrends = await Bus.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              time: { $dateToString: { format: groupByFormat, date: "$lastUpdated" } },
              line: "$lineId",
            },
            avgOccupancy: { $avg: "$occupancy.percentage" },
          },
        },
        {
          $lookup: {
            from: "lines",
            localField: "_id.line",
            foreignField: "_id",
            as: "lineInfo",
          },
        },
        {
          $unwind: "$lineInfo",
        },
        {
          $project: {
            _id: 0,
            time: "$_id.time",
            lineId: "$lineInfo.lineId",
            lineName: "$lineInfo.name",
            avgOccupancy: { $round: ["$avgOccupancy", 2] },
          },
        },
        {
          $sort: { time: 1, lineId: 1 },
        },
      ])

      // Reformater pour les graphiques (ex: { time: "08:00", L1: 70, L2: 80 })
      const formattedData = {}
      occupancyTrends.forEach((item) => {
        if (!formattedData[item.time]) {
          formattedData[item.time] = { time: item.time }
        }
        formattedData[item.time][item.lineId] = item.avgOccupancy
      })

      res.json({
        occupancyTrends: Object.values(formattedData),
        period,
        lastUpdated: new Date().toISOString(),
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// GET /api/statistics/prediction-accuracy - Précision des prédictions
router.get("/prediction-accuracy", async (req, res) => {
  try {
    const accuracyStats = await Prediction.aggregate([
      {
        $match: {
          actualValue: { $exists: true }, // Seulement les prédictions validées
        },
      },
      {
        $group: {
          _id: "$algorithm",
          averageAccuracy: { $avg: "$accuracy" },
          count: { $sum: 1 },
          minAccuracy: { $min: "$accuracy" },
          maxAccuracy: { $max: "$accuracy" },
          averageConfidence: { $avg: "$confidence" },
        },
      },
      {
        $project: {
          _id: 0,
          algorithm: "$_id",
          averageAccuracy: { $round: ["$averageAccuracy", 2] },
          count: 1,
          minAccuracy: { $round: ["$minAccuracy", 2] },
          maxAccuracy: { $round: ["$maxAccuracy", 2] },
          averageConfidence: { $round: ["$averageConfidence", 2] },
        },
      },
      {
        $sort: { averageAccuracy: -1 },
      },
    ])

    res.json({
      predictionAccuracy: accuracyStats,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

module.exports = router
