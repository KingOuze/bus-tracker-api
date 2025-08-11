const mongoose = require("mongoose")

const busSchema = new mongoose.Schema(
  {
    busId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    lineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Line",
      required: true,
    },
    currentStop: {
      type: String,
      required: true,
    },
    nextStop: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    location: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },
    speed: {
      type: Number,
      default: 0,
      min: 0,
    },
    direction: {
      type: Number,
      min: 0,
      max: 360,
    },
    delay: {
      type: Number,
      default: 0, // en minutes
    },
    occupancy: {
      level: {
        type: String,
        enum: ["low", "medium", "high", "full"],
        default: "medium",
      },
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 50,
      },
      passengerCount: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
    },
    accessibility: {
      wheelchairAccessible: {
        type: Boolean,
        default: true,
      },
      lowFloor: {
        type: Boolean,
        default: true,
      },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    estimatedArrival: {
      type: Date,
      required: true,
    },
    route: [
      {
        stopId: String,
        stopName: String,
        scheduledTime: Date,
        estimatedTime: Date,
        actualTime: Date,
        delay: Number,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Index pour les requêtes géospatiales
busSchema.index({ location: "2dsphere" })
busSchema.index({ lineId: 1, status: 1 })
busSchema.index({ lastUpdated: 1 })

// Virtual pour calculer le retard en temps réel
busSchema.virtual("currentDelay").get(function () {
  if (this.estimatedArrival && this.route.length > 0) {
    const nextStop = this.route.find((stop) => !stop.actualTime)
    if (nextStop && nextStop.scheduledTime) {
      return Math.round((this.estimatedArrival - nextStop.scheduledTime) / (1000 * 60))
    }
  }
  return this.delay
})

// Méthode pour mettre à jour la position
busSchema.methods.updateLocation = function (lat, lng, speed, direction) {
  this.location.latitude = lat
  this.location.longitude = lng
  this.speed = speed || 0
  this.direction = direction
  this.lastUpdated = new Date()
  return this.save()
}

// Méthode pour calculer la distance jusqu'à un point
busSchema.methods.distanceTo = function (lat, lng) {
  const R = 6371 // Rayon de la Terre en km
  const dLat = ((lat - this.location.latitude) * Math.PI) / 180
  const dLng = ((lng - this.location.longitude) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((this.location.latitude * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

module.exports = mongoose.model("Bus", busSchema)
