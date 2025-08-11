const mongoose = require("mongoose")

const predictionSchema = new mongoose.Schema(
  {
    busId: {
      type: String,
      required: true,
    },
    lineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Line",
      required: true,
    },
    stopId: {
      type: String,
      required: true,
    },
    predictionType: {
      type: String,
      enum: ["arrival", "delay", "occupancy", "disruption"],
      required: true,
    },
    algorithm: {
      type: String,
      enum: ["linear_regression", "exponential_moving_average", "seasonal_analysis", "ensemble"],
      required: true,
    },
    predictedValue: {
      type: Number,
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    horizon: {
      type: Number, // en minutes
      required: true,
    },
    factors: [
      {
        name: String,
        impact: Number, // -1 à 1
        confidence: Number,
      },
    ],
    externalFactors: {
      weather: {
        condition: String,
        temperature: Number,
        impact: Number,
      },
      traffic: {
        level: String,
        impact: Number,
      },
      events: [
        {
          type: String,
          impact: Number,
        },
      ],
    },
    actualValue: Number, // Valeur réelle pour validation
    accuracy: Number, // Précision calculée après validation
    validatedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index pour les requêtes de performance
predictionSchema.index({ busId: 1, createdAt: -1 })
predictionSchema.index({ lineId: 1, predictionType: 1 })
predictionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
predictionSchema.index({ algorithm: 1, accuracy: 1 })

// Méthode pour valider la prédiction
predictionSchema.methods.validate = function (actualValue) {
  this.actualValue = actualValue
  this.accuracy = this.calculateAccuracy(actualValue)
  this.validatedAt = new Date()
  return this.save()
}

// Méthode pour calculer la précision
predictionSchema.methods.calculateAccuracy = function (actualValue) {
  const error = Math.abs(this.predictedValue - actualValue)
  const maxError = Math.max(Math.abs(this.predictedValue), Math.abs(actualValue), 1)
  return Math.max(0, 100 - (error / maxError) * 100)
}

// Méthode statique pour obtenir les statistiques de performance
predictionSchema.statics.getPerformanceStats = async function (algorithm, days = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const stats = await this.aggregate([
    {
      $match: {
        algorithm: algorithm,
        validatedAt: { $gte: startDate },
        accuracy: { $exists: true },
      },
    },
    {
      $group: {
        _id: null,
        avgAccuracy: { $avg: "$accuracy" },
        count: { $sum: 1 },
        avgConfidence: { $avg: "$confidence" },
        minAccuracy: { $min: "$accuracy" },
        maxAccuracy: { $max: "$accuracy" },
      },
    },
  ])

  return (
    stats[0] || {
      avgAccuracy: 0,
      count: 0,
      avgConfidence: 0,
      minAccuracy: 0,
      maxAccuracy: 0,
    }
  )
}

module.exports = mongoose.model("Prediction", predictionSchema)
