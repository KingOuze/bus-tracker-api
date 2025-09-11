const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: true,
    unique: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true
  },
  model: {
    type: String,
    required: true
  },
  lineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Line'
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  currentLine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Line'
  },
  lastMaintenance: {
    type: Date,
    required: true
  },
  mileage: {
    type: Number,
    default: 0,
    min: 0
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Données temps réel pour le suivi
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  speed: {
    type: Number,
    default: 0
  },
  occupancy: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
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

// Index pour les requêtes géospatiales et de performance
busSchema.index({ currentLocation: '2dsphere' });
busSchema.index({ status: 1, currentLine: 1 });

module.exports = mongoose.model('Bus', busSchema);