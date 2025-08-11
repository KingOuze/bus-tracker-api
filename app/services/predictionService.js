const Prediction = require("../models/Prediction")
const Bus = require("../models/Bus")
const Line = require("../models/Line")
const cron = require("node-cron")

class PredictionService {
  constructor() {
    this.algorithms = {
      linear_regression: this.linearRegression.bind(this),
      exponential_moving_average: this.exponentialMovingAverage.bind(this),
      seasonal_analysis: this.seasonalAnalysis.bind(this),
      ensemble: this.ensemblePrediction.bind(this),
    }
  }

  // Régression linéaire
  linearRegression(historicalData, periods = 6) {
    const n = historicalData.length
    if (n < 2) return Array(periods).fill(historicalData[0] || 0)

    const sumX = historicalData.reduce((sum, _, i) => sum + i, 0)
    const sumY = historicalData.reduce((sum, val) => sum + val, 0)
    const sumXY = historicalData.reduce((sum, val, i) => sum + i * val, 0)
    const sumXX = historicalData.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return Array.from({ length: periods }, (_, i) => {
      const prediction = slope * (n + i) + intercept
      return Math.max(0, Math.min(100, prediction))
    })
  }

  // Moyenne mobile exponentielle
  exponentialMovingAverage(data, alpha = 0.3, periods = 6) {
    if (data.length === 0) return Array(periods).fill(0)

    let ema = data[0]
    for (let i = 1; i < data.length; i++) {
      ema = alpha * data[i] + (1 - alpha) * ema
    }

    const predictions = []
    for (let i = 0; i < periods; i++) {
      predictions.push(Math.max(0, Math.min(100, ema)))
      ema = ema * 0.98 // Décroissance pour simuler l'incertitude
    }

    return predictions
  }

  // Analyse saisonnière
  seasonalAnalysis(data, seasonLength = 7, periods = 6) {
    if (data.length < seasonLength) {
      return Array(periods).fill(data[data.length - 1] || 0)
    }

    const seasonalPattern = []
    for (let i = 0; i < seasonLength; i++) {
      const seasonalValues = []
      for (let j = i; j < data.length; j += seasonLength) {
        seasonalValues.push(data[j])
      }
      const average = seasonalValues.reduce((sum, val) => sum + val, 0) / seasonalValues.length
      seasonalPattern.push(average)
    }

    const predictions = []
    for (let i = 0; i < periods; i++) {
      const seasonalIndex = i % seasonLength
      const trend = data[data.length - 1] * (1 + (Math.random() - 0.5) * 0.1)
      predictions.push(Math.max(0, Math.min(100, seasonalPattern[seasonalIndex] * 0.7 + trend * 0.3)))
    }

    return predictions
  }

  // Prédiction ensemble
  ensemblePrediction(data, periods = 6) {
    const linearPreds = this.linearRegression(data, periods)
    const emaPreds = this.exponentialMovingAverage(data, 0.3, periods)
    const seasonalPreds = this.seasonalAnalysis(data, 7, periods)

    return linearPreds.map((_, i) => {
      return linearPreds[i] * 0.3 + emaPreds[i] * 0.4 + seasonalPreds[i] * 0.3
    })
  }

  // Calculer les facteurs externes
  calculateExternalFactors(weather, traffic, events) {
    const factors = []
    let impactMultiplier = 1

    // Impact météo
    if (weather) {
      switch (weather.condition) {
        case "rain":
          impactMultiplier *= 1.3
          factors.push({ name: "Pluie", impact: 0.3, confidence: 85 })
          break
        case "snow":
          impactMultiplier *= 1.8
          factors.push({ name: "Neige", impact: 0.8, confidence: 95 })
          break
        case "fog":
          impactMultiplier *= 1.2
          factors.push({ name: "Brouillard", impact: 0.2, confidence: 75 })
          break
        case "sunny":
          impactMultiplier *= 0.95
          factors.push({ name: "Temps ensoleillé", impact: -0.05, confidence: 70 })
          break
      }
    }

    // Impact trafic
    if (traffic) {
      switch (traffic.level) {
        case "heavy":
          impactMultiplier *= 1.5
          factors.push({ name: "Trafic dense", impact: 0.5, confidence: 90 })
          break
        case "moderate":
          impactMultiplier *= 1.2
          factors.push({ name: "Trafic modéré", impact: 0.2, confidence: 80 })
          break
        case "light":
          impactMultiplier *= 0.9
          factors.push({ name: "Trafic fluide", impact: -0.1, confidence: 85 })
          break
      }
    }

    // Impact événements
    if (events && events.length > 0) {
      events.forEach((event) => {
        switch (event.type) {
          case "concert":
            impactMultiplier *= 1.4
            factors.push({ name: "Concert", impact: 0.4, confidence: 80 })
            break
          case "match":
            impactMultiplier *= 1.3
            factors.push({ name: "Match sportif", impact: 0.3, confidence: 85 })
            break
          case "strike":
            impactMultiplier *= 2.0
            factors.push({ name: "Grève", impact: 1.0, confidence: 95 })
            break
          case "holiday":
            impactMultiplier *= 0.8
            factors.push({ name: "Jour férié", impact: -0.2, confidence: 90 })
            break
        }
      })
    }

    return { factors, impactMultiplier }
  }

  // Générer des prédictions pour tous les bus actifs
  async generatePredictions() {
    try {
      console.log("🔮 Génération des prédictions...")

      const activeBuses = await Bus.find({ status: "active" }).populate("lineId").limit(100)

      const predictions = []

      for (const bus of activeBuses) {
        // Obtenir les données historiques de retard
        const historicalDelays = await this.getHistoricalDelays(bus.busId, 30)

        // Simuler des conditions externes
        const externalFactors = this.calculateExternalFactors(
          { condition: "sunny", temperature: 20 },
          { level: "moderate" },
          [],
        )

        // Générer des prédictions avec différents algorithmes
        for (const [algorithm, predictor] of Object.entries(this.algorithms)) {
          const horizons = [15, 30, 60, 120] // 15min, 30min, 1h, 2h

          for (const horizon of horizons) {
            const basePredictions = predictor(historicalDelays, 1)
            const adjustedPrediction = basePredictions[0] * externalFactors.impactMultiplier

            const confidence = Math.max(60, 95 - (horizon / 15) * 5)

            const prediction = new Prediction({
              busId: bus.busId,
              lineId: bus.lineId._id,
              stopId: bus.nextStop,
              predictionType: "delay",
              algorithm: algorithm,
              predictedValue: Math.min(30, Math.max(0, adjustedPrediction)),
              confidence: confidence,
              horizon: horizon,
              factors: externalFactors.factors,
              externalFactors: {
                weather: { condition: "sunny", temperature: 20, impact: 0.05 },
                traffic: { level: "moderate", impact: 0.2 },
                events: [],
              },
              expiresAt: new Date(Date.now() + horizon * 60 * 1000),
            })

            predictions.push(prediction)
          }
        }
      }

      // Sauvegarder toutes les prédictions
      if (predictions.length > 0) {
        await Prediction.insertMany(predictions)
        console.log(`✅ ${predictions.length} prédictions générées`)
      }
    } catch (error) {
      console.error("❌ Erreur lors de la génération des prédictions:", error)
    }
  }

  // Obtenir les données historiques de retard
  async getHistoricalDelays(busId, days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Simuler des données historiques (en production, récupérer depuis la DB)
    const delays = []
    for (let i = 0; i < days; i++) {
      delays.push(Math.random() * 10 + Math.sin(i * 0.1) * 3 + 2)
    }

    return delays
  }

  // Valider les prédictions expirées
  async validateExpiredPredictions() {
    try {
      const expiredPredictions = await Prediction.find({
        expiresAt: { $lt: new Date() },
        actualValue: { $exists: false },
      })

      for (const prediction of expiredPredictions) {
        // Simuler une valeur réelle (en production, récupérer depuis les données réelles)
        const actualValue = prediction.predictedValue + (Math.random() - 0.5) * 4
        await prediction.validate(actualValue)
      }

      console.log(`✅ ${expiredPredictions.length} prédictions validées`)
    } catch (error) {
      console.error("❌ Erreur lors de la validation:", error)
    }
  }

  // Démarrer les mises à jour automatiques
  startPredictionUpdates() {
    // Générer des prédictions toutes les 5 minutes
    cron.schedule("*/5 * * * *", () => {
      this.generatePredictions()
    })

    // Valider les prédictions toutes les minutes
    cron.schedule("* * * * *", () => {
      this.validateExpiredPredictions()
    })

    console.log("🚀 Service de prédictions démarré")
  }

  // Obtenir les statistiques de performance
  async getPerformanceStats() {
    const algorithms = ["linear_regression", "exponential_moving_average", "seasonal_analysis", "ensemble"]
    const stats = {}

    for (const algorithm of algorithms) {
      stats[algorithm] = await Prediction.getPerformanceStats(algorithm)
    }

    return stats
  }
}

module.exports = PredictionService
