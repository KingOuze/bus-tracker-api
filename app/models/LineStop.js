const mongoose = require('mongoose');

const lineStopSchema = new mongoose.Schema({
  lineId: { type: mongoose.Schema.Types.ObjectId, ref: "Line", required: true },
  stopId: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", required: true },
  order: { type: Number, required: true }, // position dans l’itinéraire
  direction: { type: String, enum: ["go", "return"], required: true }, // 🚩 nouvelle info
  
})



module.exports = mongoose.model('LineStop', lineStopSchema);