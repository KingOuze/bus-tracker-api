const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "../.env" });

// Import des models
const User = require("../models/User");
const Company = require("../models/Company");
const Line = require("../models/Line");
const Bus = require("../models/Bus");
const Alert = require("../models/Alert");
const Prediction = require("../models/Prediction");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bus-tracker";

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connecté à MongoDB pour le seeding");

    // --- Nettoyage des collections existantes ---
    console.log("🗑️ Nettoyage des collections existantes...");
    await User.deleteMany({});
    await Company.deleteMany({});
    await Line.deleteMany({});
    await Bus.deleteMany({});
    await Alert.deleteMany({});
    await Prediction.deleteMany({});
    console.log("✅ Collections nettoyées.");

    // --- Création d'une compagnie ---
    console.log("🏢 Création de la compagnie...");
    const company = await Company.create({
      name: "Default Transport Company",
      
      address: "Dakar, Sénégal",
      status: "active",
    });
    console.log(`✅ Company créée : ${company.name}`);

    // --- Création des utilisateurs ---
    console.log("👤 Création des utilisateurs...");
    const adminPassword = await bcrypt.hash("admin123", 10);
    const userPassword = await bcrypt.hash("user123", 10);

    const users = await User.insertMany([
      {
        firstName: "Super",
        lastName: "Admin",
        email: "admin@example.com",
        password: adminPassword,
        role: "superAdmin",
        phone: "+221770000001",
        company: company._id,
        status: "active",
      },
      {
        firstName: "Opérateur",
        lastName: "Un",
        email: "operator1@example.com",
        password: userPassword,
        role: "operator",
        phone: "+221770000002",
        company: company._id,
        status: "active",
      },
      {
        firstName: "Utilisateur",
        lastName: "Un",
        email: "user1@example.com",
        password: userPassword,
        role: "user",
        phone: "+221770000003",
        company: company._id,
        status: "active",
      },
      {
        firstName: "Utilisateur",
        lastName: "Deux",
        email: "user2@example.com",
        password: userPassword,
        role: "user",
        phone: "+221770000004",
        company: company._id,
        status: "active",
      },
    ]);
    console.log(`✅ ${users.length} utilisateurs créés.`);

    // --- Création des lignes de bus ---
    console.log("🚌 Création des lignes de bus...");
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
        company: company._id, // ⚡ Ajout de la company si ton modèle Line l’exige
        route: {
          outbound: [
            { stopId: "S001", name: "Gare Centrale", location: { latitude: 48.8584, longitude: 2.2945 }, order: 1 },
            { stopId: "S002", name: "Place de la République", location: { latitude: 48.8679, longitude: 2.3658 }, order: 2 },
            { stopId: "S003", name: "Opéra", location: { latitude: 48.8719, longitude: 2.3314 }, order: 3 },
          ],
          inbound: [
            { stopId: "S003", name: "Opéra", location: { latitude: 48.8719, longitude: 2.3314 }, order: 1 },
            { stopId: "S002", name: "Place de la République", location: { latitude: 48.8679, longitude: 2.3658 }, order: 2 },
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
        company: company._id,
        route: {
          outbound: [
            { stopId: "S004", name: "Campus Nord", location: { latitude: 48.845, longitude: 2.31 }, order: 1 },
            { stopId: "S005", name: "Bibliothèque Municipale", location: { latitude: 48.85, longitude: 2.32 }, order: 2 },
            { stopId: "S006", name: "Parc des Expositions", location: { latitude: 48.855, longitude: 2.33 }, order: 3 },
          ],
          inbound: [
            { stopId: "S006", name: "Parc des Expositions", location: { latitude: 48.855, longitude: 2.33 }, order: 1 },
            { stopId: "S005", name: "Bibliothèque Municipale", location: { latitude: 48.85, longitude: 2.32 }, order: 2 },
            { stopId: "S004", name: "Campus Nord", location: { latitude: 48.845, longitude: 2.31 }, order: 3 },
          ],
        },
      },
    ]);
    console.log(`✅ ${lines.length} lignes de bus créées.`);

    // --- Création des bus ---
    console.log("🚍 Création des bus...");
    const buses = await Bus.insertMany([
      {
        busId: "B001",
        lineId: lines[0]._id,
        currentStop: "Place de la République",
        nextStop: "Opéra",
        destination: "Gare Centrale",
        location: { latitude: 48.867, longitude: 2.36 },
        speed: 25,
        direction: 90,
        delay: 0,
        occupancy: { level: "medium", percentage: 50, passengerCount: 30 },
        status: "active",
      },
      {
        busId: "B002",
        lineId: lines[1]._id,
        currentStop: "Campus Nord",
        nextStop: "Bibliothèque Municipale",
        destination: "Parc des Expositions",
        location: { latitude: 48.846, longitude: 2.311 },
        speed: 30,
        direction: 180,
        delay: 3,
        occupancy: { level: "high", percentage: 80, passengerCount: 45 },
        status: "delayed",
      },
    ]);
    console.log(`✅ ${buses.length} bus créés.`);

    // --- Création des alertes ---
    console.log("🚨 Création des alertes...");
    const alerts = await Alert.insertMany([
      {
        alertId: "A001",
        type: "warning",
        severity: "medium",
        title: "Retard Ligne L2",
        message: "Ligne L2 : Léger retard dû au trafic dense.",
        affectedLines: [lines[1]._id],
        source: "system",
        category: "traffic",
        startTime: new Date(),
        status: "active",
      },
      {
        alertId: "A002",
        type: "disruption",
        severity: "high",
        title: "Incident technique Ligne L1",
        message: "Service interrompu temporairement.",
        affectedLines: [lines[0]._id],
        source: "system",
        category: "technical",
        startTime: new Date(),
        status: "active",
      },
    ]);
    console.log(`✅ ${alerts.length} alertes créées.`);

    // --- Création des prédictions ---
    console.log("🔮 Création des prédictions...");
    const predictions = await Prediction.insertMany([
      {
        busId: buses[0].busId,
        lineId: buses[0].lineId,
        stopId: buses[0].nextStop,
        predictionType: "delay",
        algorithm: "ensemble",
        predictedValue: 3,
        confidence: 85,
        horizon: 15,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    ]);
    console.log(`✅ ${predictions.length} prédictions créées.`);

    console.log("🎉 Seeding terminé avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors du seeding:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Déconnecté de MongoDB.");
  }
};

seedDatabase();
