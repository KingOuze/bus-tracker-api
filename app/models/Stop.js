const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  zone: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  lines: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Line'
  }],
  dailyPassengers: {
    type: Number,
    default: 0,
    min: 0
  },
  accessibility: {
    type: Boolean,
    default: false
  },
  // Informations supplémentaires sur l'arrêt
  amenities: [{
    type: String,
    enum: ['shelter', 'bench', 'lighting', 'wifi', 'ticketing', 'information_display']
  }],
  capacity: {
    type: Number,
    default: 50
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

// Index géospatial pour recherche par proximité
stopSchema.index({ 
  latitude: 1, 
  longitude: 1 
}, { 
  name: 'location_2d' 
});
stopSchema.index({ zone: 1, status: 1 });

module.exports = mongoose.model('Stop', stopSchema);