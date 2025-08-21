// models/Stop.js
const mongoose = require("mongoose")

const stopSchema = new mongoose.Schema({
  stopId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  location: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
  },
  accessibility: {
    wheelchairAccessible: { type: Boolean, default: false },
    sheltered: { type: Boolean, default: false },
    realTimeInfo: { type: Boolean, default: false },
  },

  
  // Lignes associées (many-to-many)
  lines: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Line",
    },
  ],
})

module.exports = mongoose.model("Stop", stopSchema)
