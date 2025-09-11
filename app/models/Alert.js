const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'error', 'success', 'maintenance', 'disruption'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  description: {
    type: String,
    maxlength: 2000
  },
  source: {
    type: String,
    enum: ['system', 'operator', 'prediction', 'external', 'user'],
    required: true
  },
  category: {
    type: String,
    enum: ['delay', 'cancellation', 'route_change', 'technical', 'weather', 'traffic', 'event'],
    required: true
  },
  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 5
  },
  status: {
    type: String,
    enum: ['active', 'investigating', 'resolved', 'closed'],
    default: 'active'
  },
  affectedLines: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Line'
  }],
  affectedStops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop'
  }],
  affectedBuses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus'
  }],
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    radius: {
      type: Number,
      min: 0,
      default: 1000 // mètres
    }
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  estimatedDuration: {
    type: Number, // en minutes
    min: 0
  },
  impact: {
    delayMinutes: {
      type: Number,
      min: 0
    },
    affectedPassengers: {
      type: Number,
      min: 0
    },
    alternativeRoutes: [{
      type: String
    }]
  },
  // Informations automatiques
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index pour les requêtes fréquentes
alertSchema.index({ status: 1, startTime: 1 });
alertSchema.index({ severity: 1, type: 1 });
alertSchema.index({ location: '2dsphere' });

// Middleware pour générer automatiquement l'alertId
alertSchema.pre('save', function(next) {
  if (!this.alertId) {
    this.alertId = `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Alert', alertSchema);