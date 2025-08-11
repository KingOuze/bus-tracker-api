const mongoose = require("mongoose")

const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["info", "warning", "error", "success", "maintenance", "disruption"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    description: String,
    affectedLines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Line",
      },
    ],
    affectedStops: [String],
    affectedBuses: [String],
    location: {
      latitude: Number,
      longitude: Number,
      radius: Number, // en mètres
    },
    status: {
      type: String,
      enum: ["active", "resolved", "scheduled", "cancelled"],
      default: "active",
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    source: {
      type: String,
      enum: ["system", "operator", "prediction", "external", "user"],
      required: true,
    },
    category: {
      type: String,
      enum: ["delay", "cancellation", "route_change", "technical", "weather", "traffic", "event"],
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: Date,
    estimatedDuration: Number, // en minutes
    impact: {
      delayMinutes: Number,
      affectedPassengers: Number,
      alternativeRoutes: [String],
    },
    actions: [
      {
        type: String,
        description: String,
        completedAt: Date,
      },
    ],
    notifications: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,
      channels: [String], // email, sms, push, app
      recipients: Number,
    },
    metadata: {
      createdBy: String,
      updatedBy: String,
      tags: [String],
      externalId: String,
    },
  },
  {
    timestamps: true,
  },
)

// Index pour les requêtes de performance
alertSchema.index({ status: 1, startTime: -1 })
alertSchema.index({ affectedLines: 1, status: 1 })
alertSchema.index({ type: 1, severity: 1 })
alertSchema.index({ location: "2dsphere" })
alertSchema.index({ startTime: 1, endTime: 1 })

// Méthode pour résoudre l'alerte
alertSchema.methods.resolve = function (resolvedBy) {
  this.status = "resolved"
  this.endTime = new Date()
  this.metadata.updatedBy = resolvedBy
  return this.save()
}

// Méthode pour calculer la durée
alertSchema.virtual("duration").get(function () {
  if (this.endTime) {
    return Math.round((this.endTime - this.startTime) / (1000 * 60)) // en minutes
  }
  return Math.round((new Date() - this.startTime) / (1000 * 60))
})

// Méthode pour vérifier si l'alerte affecte une position
alertSchema.methods.affectsLocation = function (lat, lng) {
  if (!this.location || !this.location.latitude || !this.location.longitude) {
    return false
  }

  const distance = this.calculateDistance(lat, lng, this.location.latitude, this.location.longitude)

  return distance <= this.location.radius / 1000 // convertir en km
}

// Méthode utilitaire pour calculer la distance
alertSchema.methods.calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

module.exports = mongoose.model("Alert", alertSchema)
