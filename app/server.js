const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const compression = require("compression")
const morgan = require("morgan")
const http = require("http")
const socketIo = require("socket.io")
require("dotenv").config()

// Import routes
const busRoutes = require("./routes/buses")
const lineRoutes = require("./routes/lines")
const predictionRoutes = require("./routes/predictions")
const alertRoutes = require("./routes/alerts")
const statisticsRoutes = require("./routes/statistics")
const authRoutes = require("./routes/auth")

// Import middleware
const errorHandler = require("./middleware/errorHandler")
const { authenticateToken } = require("./middleware/auth")

// Import services
const PredictionService = require("./services/predictionService")
const RealtimeService = require("./services/realtimeService")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST",],
  },
})

// Middleware
app.use(helmet())
app.use(compression())
app.use(morgan("combined"))

const allowedOrigins = ["http://localhost:3000"];

app.use(cors({
  origin: function(origin, callback){
    // Autoriser les requêtes sans origine (ex: Postman, CURL)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = "L'origine CORS n'est pas autorisée.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Trop de requêtes depuis cette IP, réessayez plus tard.",
})
app.use("/api/", limiter)

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/bus-tracker", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connecté à MongoDB"))
  .catch((err) => console.error("❌ Erreur de connexion MongoDB:", err))

// Socket.IO for real-time updates
const realtimeService = new RealtimeService(io)
realtimeService.start()

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/buses", busRoutes)
app.use("/api/lines", lineRoutes)
app.use("/api/predictions", predictionRoutes)
app.use("/api/alerts", alertRoutes)
app.use("/api/statistics", statisticsRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  })
})

// API documentation
app.get("/api", (req, res) => {
  res.json({
    name: "Bus Tracker API",
    version: "1.0.0",
    description: "API pour le suivi des bus en temps réel avec prédictions IA",
    endpoints: {
      auth: "/api/auth",
      buses: "/api/buses",
      lines: "/api/lines",
      predictions: "/api/predictions",
      alerts: "/api/alerts",
      statistics: "/api/statistics",
      health: "/api/health",
    },
    documentation: "https://api-docs.bustracker.com",
  })
})

// Error handling
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint non trouvé",
    message: `La route ${req.originalUrl} n'existe pas`,
  })
})

// Start prediction service
const predictionService = new PredictionService()
predictionService.startPredictionUpdates()

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`)
  console.log(`📊 API disponible sur http://localhost:${PORT}/api`)
})

module.exports = app
