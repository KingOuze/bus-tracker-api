const mongoose = require("mongoose")


const scheduleSchema = new mongoose.Schema({
  dayType: {
    type: String,
    enum: ["weekday", "saturday", "sunday", "holiday"],
    required: true,
  },
  times: [
    {
      stopId: String,
      arrivalTime: String, // Format HH:MM
      departureTime: String,
    },
  ],
})

const lineSchema = new mongoose.Schema(
  {
    lineId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    color: { type: String, default: "#007bff" },
    description: String,
    type: { type: String, enum: ["bus", "tram", "metro"], default: "bus" },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance", "disrupted"],
      default: "active",
    },
    company: {
      type: String,
      enum: ["DDD", "TATA", "companyC"],
      default: "DDD",
    },
    stops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stop",
      },
    ], // Référence vers plusieurs arrêts
  },
  { timestamps: true }
)

// Index pour les recherches
lineSchema.index({ lineId: 1 })
lineSchema.index({ status: 1 })
lineSchema.index({ "route.outbound.location": "2dsphere" })
lineSchema.index({ "route.inbound.location": "2dsphere" })

// Méthode pour obtenir tous les arrêts
lineSchema.methods.getAllStops = function () {
  const outbound = this.route.outbound || []
  const inbound = this.route.inbound || []
  return [...outbound, ...inbound]
}

// Méthode pour trouver l'arrêt le plus proche
lineSchema.methods.findNearestStop = function (lat, lng, maxDistance = 1) {
  const stops = this.getAllStops()
  let nearest = null
  let minDistance = maxDistance

  stops.forEach((stop) => {
    const distance = this.calculateDistance(lat, lng, stop.location.latitude, stop.location.longitude)
    if (distance < minDistance) {
      minDistance = distance
      nearest = { ...stop.toObject(), distance }
    }
  })

  return nearest
}

// Méthode utilitaire pour calculer la distance
lineSchema.methods.calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

module.exports = mongoose.model("Line", lineSchema)
