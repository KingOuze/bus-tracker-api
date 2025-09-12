const mongoose = require('mongoose');


const predictionSchema = new mongoose.Schema({
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true
  },
  lineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Line',
    required: true
  },
  stopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop'
  },
  predictionType: {
    type: String,
    enum: ['arrival', 'delay', 'occupancy', 'disruption'],
    required: true
  },
  algorithm: {
    type: String,
    enum: ['linear_regression', 'exponential_moving_average', 'seasonal_analysis', 'ensemble'],
    required: true
  },
  predictedValue: {
    type: Number,
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  horizon: {
    type: Number,
    required: true,
    min: 1 // minutes dans le futur
  },
  factors: [{
    name: {
      type: String,
      required: true
    },
    impact: {
      type: Number,
      required: true,
      min: -1,
      max: 1
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    }
  }],
  externalFactors: {
    weather: {
      condition: {
        type: String,
        enum: ['sunny', 'cloudy', 'rainy', 'stormy', 'foggy']
      },
      temperature: Number,
      impact: {
        type: Number,
        min: -1,
        max: 1
      }
    },
    traffic: {
      level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      impact: {
        type: Number,
        min: -1,
        max: 1
      }
    },
    events: [{
      type: {
        type: String,
        enum: ['sports', 'concert', 'festival', 'protest', 'construction', 'accident']
      },
      impact: {
        type: Number,
        min: -1,
        max: 1
      }
    }]
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },
  // Données pour validation et amélioration
  actualValue: Number,
  accuracy: Number,
  validated: {
    type: Boolean,
    default: false
  }
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
predictionSchema.index({ busId: 1, predictionType: 1 });
predictionSchema.index({ lineId: 1, createdAt: -1 });
predictionSchema.index({ algorithm: 1, validated: 1 });

// Middleware pour calculer automatiquement expiresAt
predictionSchema.pre('save', function(next) {
  if (!this.expiresAt && this.horizon) {
    this.expiresAt = new Date(Date.now() + this.horizon * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Prediction', predictionSchema);