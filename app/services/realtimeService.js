const Bus = require("../models/Bus")
const cron = require("node-cron")

class RealtimeService {
  constructor(io) {
    this.io = io
    this.busUpdateInterval = 5000 // Mettre à jour toutes les 5 secondes
    this.busSimulationTask = null
  }

  start() {
    console.log("⚡ Service temps réel démarré")
    this.io.on("connection", (socket) => {
      console.log(`Client connecté: ${socket.id}`)

      // Envoyer les données initiales des bus
      this.sendInitialBusData(socket)

      socket.on("disconnect", () => {
        console.log(`Client déconnecté: ${socket.id}`)
      })

      // Gérer les requêtes spécifiques du client
      socket.on("requestBusUpdate", async (busId) => {
        try {
          const bus = await Bus.findOne({ busId: busId }).populate("lineId", "lineId name shortName color")
          if (bus) {
            socket.emit("busUpdate", bus)
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du bus:", error)
        }
      })
    })

    // Démarrer la simulation de mise à jour des bus
    this.startBusSimulation()
  }

  async sendInitialBusData(socket) {
    try {
      const buses = await Bus.find({ status: "active" }).populate("lineId", "lineId name shortName color")
      socket.emit("initialBusData", buses)
    } catch (error) {
      console.error("Erreur lors de l'envoi des données initiales:", error)
    }
  }

  startBusSimulation() {
    if (this.busSimulationTask) {
      this.busSimulationTask.stop()
    }

    // Simuler les mises à jour des bus toutes les 5 secondes
    this.busSimulationTask = cron.schedule("*/5 * * * * *", async () => {
      try {
        const activeBuses = await Bus.find({ status: "active" }).populate("lineId")

        for (const bus of activeBuses) {
          // Simuler un mouvement aléatoire
          const newLat = bus.location.latitude + (Math.random() - 0.5) * 0.001
          const newLng = bus.location.longitude + (Math.random() - 0.5) * 0.001
          const newSpeed = Math.max(0, bus.speed + (Math.random() - 0.5) * 5) // +/- 5 km/h
          const newDirection = Math.floor(Math.random() * 360)

          // Simuler un léger changement de retard
          const newDelay = Math.max(0, bus.delay + Math.floor(Math.random() * 3) - 1) // +/- 1 min

          await bus.updateLocation(newLat, newLng, newSpeed, newDirection)
          bus.delay = newDelay
          await bus.save()

          // Émettre la mise à jour à tous les clients connectés
          this.io.emit("busUpdate", {
            busId: bus.busId,
            lineId: bus.lineId.lineId,
            lineName: bus.lineId.name,
            lineColor: bus.lineId.color,
            location: bus.location,
            speed: bus.speed,
            direction: bus.direction,
            delay: bus.delay,
            occupancy: bus.occupancy,
            currentStop: bus.currentStop,
            nextStop: bus.nextStop,
            destination: bus.destination,
            lastUpdated: bus.lastUpdated,
            estimatedArrival: bus.estimatedArrival,
          })
        }
        // console.log(`Simulated updates for ${activeBuses.length} buses.`)
      } catch (error) {
        console.error("Erreur lors de la simulation des bus:", error)
      }
    })
  }

  stop() {
    if (this.busSimulationTask) {
      this.busSimulationTask.stop()
      console.log("Service temps réel arrêté.")
    }
  }
}

module.exports = RealtimeService
