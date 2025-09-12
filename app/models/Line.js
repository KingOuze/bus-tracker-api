const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  number: {
    type: String,
    required: true,
    unique: true
  },
  shortName: {
    type: String
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9A-F]{6}$/i
  },
  startStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop',
    required: true
  },
  endStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop',
    required: true
  },
  totalStops: {
    type: Number,
    required: true,
    min: 2
  },
  distance: {
    type: Number,
    required: true,
    min: 0 // en kilomètres
  },
  duration: {
    type: Number,
    required: true,
    min: 1 // en minutes
  },
  frequency: {
    type: Number,
    required: true,
    min: 1 // en minutes entre les bus
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  dailyRides: {
    type: Number,
    default: 0,
    min: 0
  },
  assignedBuses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus'
  }],
  // Informations détaillées sur les arrêts de la ligne
  stops: [{
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop'
    },
    order: {
      type: Number,
      required: true
    },
    distanceFromStart: {
      type: Number,
      default: 0
    },
    estimatedTime: {
      type: Number,
      default: 0
    }
  }],
  // Horaires de service
  schedule: {
    weekday: {
      startTime: String,
      endTime: String,
      frequency: Number
    },
    weekend: {
      startTime: String,
      endTime: String,
      frequency: Number
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      ret.lineId = ret._id; // Pour compatibilité avec votre frontend
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

lineSchema.index({ status: 1 });
lineSchema.index({ 'stops.stop': 1 });

module.exports = mongoose.model('Line', lineSchema);