const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config({ path: "../.env" }) // Assurez-vous que le chemin est correct

const User = require("../models/User")
const Line = require("../models/Line")
const Bus = require("../models/Bus")
const Alert = require("../models/Alert")
const Prediction = require("../models/Prediction")

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bus-tracker"

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log("✅ Connecté à MongoDB pour le seeding")

    // --- Nettoyage des collections existantes ---
    console.log("🗑️ Nettoyage des collections existantes...")
    await User.deleteMany({})
    await Line.deleteMany({})
    await Bus.deleteMany({})
    await Alert.deleteMany({})
    await Prediction.deleteMany({})
    console.log("✅ Collections nettoyées.")

    // --- Création des utilisateurs ---
    console.log("👤 Création des utilisateurs...")
    const adminPassword = await bcrypt.hash("admin123", 10)
    const userPassword = await bcrypt.hash("user123", 10)

    const users = await User.insertMany([
      {
        username: "admin",
        email: "admin@example.com",
        password: adminPassword,
        role: "admin",
        profile: { firstName: "Super", lastName: "Admin" },
      },
      {
        username: "operator1",
        email: "operator1@example.com",
        password: userPassword,
        role: "operator",
        profile: { firstName: "Opérateur", lastName: "Un" },
      },
      {
        username: "user1",
        email: "user1@example.com",
        password: userPassword,
        role: "user",
        profile: { firstName: "Utilisateur", lastName: "Un" },
      },
      {
        username: "user2",
        email: "user2@example.com",
        password: userPassword,
        role: "user",
        profile: { firstName: "Utilisateur", lastName: "Deux" },
      },
    ])
    console.log(`✅ ${users.length} utilisateurs créés.`)

    // --- Création des lignes de bus ---
    console.log("🚌 Création des lignes de bus...")
    const lines = await Line.insertMany([
      {
        lineId: "L1",
        name: "Ligne 1 - Centre Ville",
        shortName: "Centre",
        color: "#007bff",
        textColor: "#ffffff",
        description: "Ligne principale traversant le centre-ville.",
        type: "bus",
        status: "active",
        route: {
          outbound: [
            { stopId: "S001", name: "Gare Centrale", location: { latitude: 48.8584, longitude: 2.2945 }, order: 1 },
            {
              stopId: "S002",
              name: "Place de la République",
              location: { latitude: 48.8679, longitude: 2.3658 },
              order: 2,
            },
            { stopId: "S003", name: "Opéra", location: { latitude: 48.8719, longitude: 2.3314 }, order: 3 },
          ],
          inbound: [
            { stopId: "S003", name: "Opéra", location: { latitude: 48.8719, longitude: 2.3314 }, order: 1 },
            {
              stopId: "S002",
              name: "Place de la République",
              location: { latitude: 48.8679, longitude: 2.3658 },
              order: 2,
            },
            { stopId: "S001", name: "Gare Centrale", location: { latitude: 48.8584, longitude: 2.2945 }, order: 3 },
          ],
        },
      },
      {
        lineId: "L2",
        name: "Ligne 2 - Université",
        shortName: "Uni",
        color: "#28a745",
        textColor: "#ffffff",
        description: "Ligne desservant le campus universitaire.",
        type: "bus",
        status: "active",
        route: {
          outbound: [
            { stopId: "S004", name: "Campus Nord", location: { latitude: 48.845, longitude: 2.31 }, order: 1 },
            {
              stopId: "S005",
              name: "Bibliothèque Municipale",
              location: { latitude: 48.85, longitude: 2.32 },
              order: 2,
            },
            { stopId: "S006", name: "Parc des Expositions", location: { latitude: 48.855, longitude: 2.33 }, order: 3 },
          ],
          inbound: [
            { stopId: "S006", name: "Parc des Expositions", location: { latitude: 48.855, longitude: 2.33 }, order: 1 },
            {
              stopId: "S005",
              name: "Bibliothèque Municipale",
              location: { latitude: 48.85, longitude: 2.32 },
              order: 2,
            },
            { stopId: "S004", name: "Campus Nord", location: { latitude: 48.845, longitude: 2.31 }, order: 3 },
          ],
        },
      },
      {
        lineId: "L3",
        name: "Ligne 3 - Aéroport",
        shortName: "Aéro",
        color: "#dc3545",
        textColor: "#ffffff",
        description: "Ligne express vers l'aéroport.",
        type: "bus",
        status: "active",
        route: {
          outbound: [
            { stopId: "S007", name: "Centre Ville", location: { latitude: 48.86, longitude: 2.35 }, order: 1 },
            { stopId: "S008", name: "Porte de Versailles", location: { latitude: 48.83, longitude: 2.29 }, order: 2 },
            { stopId: "S009", name: "Aéroport Terminal 1", location: { latitude: 48.9, longitude: 2.55 }, order: 3 },
          ],
          inbound: [
            { stopId: "S009", name: "Aéroport Terminal 1", location: { latitude: 48.9, longitude: 2.55 }, order: 1 },
            { stopId: "S008", name: "Porte de Versailles", location: { latitude: 48.83, longitude: 2.29 }, order: 2 },
            { stopId: "S007", name: "Centre Ville", location: { latitude: 48.86, longitude: 2.35 }, order: 3 },
          ],
        },
      },
    ])
    console.log(`✅ ${lines.length} lignes de bus créées.`)

    // --- Création des bus ---
    console.log("🚍 Création des bus...")
    const buses = await Bus.insertMany([
      {
        busId: "B001",
        lineId: lines[0]._id, // Ligne 1
        currentStop: "Place de la République",
        nextStop: "Opéra",
        destination: "Gare Centrale",
        location: { latitude: 48.867, longitude: 2.36 },
        speed: 25,
        direction: 90,
        delay: 0,
        occupancy: { level: "medium", percentage: 50, passengerCount: 30 },
        status: "active",
        estimatedArrival: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
      },
      {
        busId: "B002",
        lineId: lines[1]._id, // Ligne 2
        currentStop: "Campus Nord",
        nextStop: "Bibliothèque Municipale",
        destination: "Parc des Expositions",
        location: { latitude: 48.846, longitude: 2.311 },
        speed: 30,
        direction: 180,
        delay: 3,
        occupancy: { level: "high", percentage: 80, passengerCount: 45 },
        status: "delayed",
        estimatedArrival: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
      {
        busId: "B003",
        lineId: lines[0]._id, // Ligne 1
        currentStop: "Opéra",
        nextStop: "Place de la République",
        destination: "Gare Centrale",
        location: { latitude: 48.871, longitude: 2.332 },
        speed: 20,
        direction: 270,
        delay: -1,
        occupancy: { level: "low", percentage: 20, passengerCount: 10 },
        status: "onTime",
        estimatedArrival: new Date(Date.now() + 1 * 60 * 1000), // 1 minute
      },
      {
        busId: "B004",
        lineId: lines[2]._id, // Ligne 3
        currentStop: "Centre Ville",
        nextStop: "Porte de Versailles",
        destination: "Aéroport Terminal 1",
        location: { latitude: 48.861, longitude: 2.351 },
        speed: 40,
        direction: 45,
        delay: 5,
        occupancy: { level: "full", percentage: 95, passengerCount: 55 },
        status: "delayed",
        estimatedArrival: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    ])
    console.log(`✅ ${buses.length} bus créés.`)

    // --- Création des alertes ---
    console.log("🚨 Création des alertes...")
    const alerts = await Alert.insertMany([
      {
        alertId: "A001",
        type: "warning",
        severity: "medium",
        title: "Retard Ligne L2",
        message: "Ligne L2 : Léger retard dû au trafic dense sur l'avenue principale.",
        affectedLines: [lines[1]._id], // Ligne 2
        source: "system",
        category: "traffic",
        startTime: new Date(Date.now() - 30 * 60 * 1000), // Il y a 30 min
        location: { latitude: 48.85, longitude: 2.32, radius: 1000 },
      },
      {
        alertId: "A002",
        type: "info",
        severity: "low",
        title: "Travaux Ligne L1",
        message: "Travaux de voirie sur le parcours de la Ligne L1, prévoir de légers ralentissements.",
        affectedLines: [lines[0]._id], // Ligne 1
        source: "operator",
        category: "route_change",
        startTime: new Date(Date.now() - 60 * 60 * 1000), // Il y a 1h
        status: "active",
      },
      {
        alertId: "A003",
        type: "disruption",
        severity: "high",
        title: "Perturbation Ligne L3",
        message:
          "Perturbation majeure sur la Ligne L3 suite à un incident technique. Service interrompu temporairement.",
        affectedLines: [lines[2]._id], // Ligne 3
        source: "system",
        category: "technical",
        startTime: new Date(Date.now() - 10 * 60 * 1000), // Il y a 10 min
        status: "active",
      },
    ])
    console.log(`✅ ${alerts.length} alertes créées.`)

    // --- Création des prédictions ---
    console.log("🔮 Création des prédictions...")
    const predictions = await Prediction.insertMany([
      {
        busId: buses[0].busId,
        lineId: buses[0].lineId,
        stopId: buses[0].nextStop,
        predictionType: "delay",
        algorithm: "ensemble",
        predictedValue: 2.5, // 2.5 minutes de retard
        confidence: 90,
        horizon: 15, // 15 minutes
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      {
        busId: buses[1].busId,
        lineId: buses[1].lineId,
        stopId: buses[1].nextStop,
        predictionType: "delay",
        algorithm: "ensemble",
        predictedValue: 7.0, // 7 minutes de retard
        confidence: 80,
        horizon: 30, // 30 minutes
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
      {
        busId: buses[2].busId,
        lineId: buses[2].lineId,
        stopId: buses[2].nextStop,
        predictionType: "occupancy",
        algorithm: "ensemble",
        predictedValue: 35, // 35% d'occupation
        confidence: 88,
        horizon: 10, // 10 minutes
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    ])
    console.log(`✅ ${predictions.length} prédictions créées.`)

    console.log("🎉 Seeding de la base de données terminé avec succès !")
  } catch (error) {
    console.error("❌ Erreur lors du seeding de la base de données:", error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log("🔌 Déconnecté de MongoDB.")
  }
}

seedDatabase()
