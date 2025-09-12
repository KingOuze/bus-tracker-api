// models/Stop.js
const mongoose = require("mongoose")

const stopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
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
