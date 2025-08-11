const express = require("express")
const { body, validationResult } = require("express-validator")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Données invalides",
      details: errors.array(),
    })
  }
  next()
}

// POST /api/auth/register - Enregistrement d'un nouvel utilisateur
router.post(
  "/register",
  [
    body("username").isLength({ min: 3 }).withMessage("Le nom d'utilisateur doit avoir au moins 3 caractères"),
    body("email").isEmail().withMessage("Veuillez entrer une adresse email valide"),
    body("password").isLength({ min: 6 }).withMessage("Le mot de passe doit avoir au moins 6 caractères"),
    body("role").optional().isIn(["user", "operator", "admin"]).withMessage("Rôle invalide"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, password, role } = req.body

      // Vérifier si l'utilisateur existe déjà
      let user = await User.findOne({ $or: [{ email }, { username }] })
      if (user) {
        return res.status(400).json({
          error: "Utilisateur existant",
          message: "Un utilisateur avec cet email ou nom d'utilisateur existe déjà",
        })
      }

      user = new User({
        username,
        email,
        password, // Le mot de passe sera haché par le middleware pre-save
        role: role || "user",
      })

      await user.save()

      // Générer un token JWT
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      })

      res.status(201).json({
        message: "Utilisateur enregistré avec succès",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// POST /api/auth/login - Connexion de l'utilisateur
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Veuillez entrer une adresse email valide"),
    body("password").notEmpty().withMessage("Le mot de passe est requis"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body

      // Vérifier si l'utilisateur existe
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(400).json({
          error: "Identifiants invalides",
          message: "Email ou mot de passe incorrect",
        })
      }

      // Vérifier le mot de passe
      const isMatch = await user.matchPassword(password)
      if (!isMatch) {
        return res.status(400).json({
          error: "Identifiants invalides",
          message: "Email ou mot de passe incorrect",
        })
      }

      // Mettre à jour la dernière connexion
      user.lastLogin = new Date()
      await user.save()

      // Générer un token JWT
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      })

      res.json({
        message: "Connexion réussie",
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
        },
        token,
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

// GET /api/auth/profile - Obtenir le profil de l'utilisateur (authentification requise)
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password") // Exclure le mot de passe

    if (!user) {
      return res.status(404).json({
        error: "Utilisateur non trouvé",
      })
    }

    res.json({
      user,
    })
  } catch (error) {
    res.status(500).json({
      error: "Erreur serveur",
      message: error.message,
    })
  }
})

// PUT /api/auth/profile - Mettre à jour le profil de l'utilisateur (authentification requise)
router.put(
  "/profile",
  authenticateToken,
  [
    body("username")
      .optional()
      .isLength({ min: 3 })
      .withMessage("Le nom d'utilisateur doit avoir au moins 3 caractères"),
    body("email").optional().isEmail().withMessage("Veuillez entrer une adresse email valide"),
    body("password").optional().isLength({ min: 6 }).withMessage("Le mot de passe doit avoir au moins 6 caractères"),
    body("profile.firstName").optional().isString(),
    body("profile.lastName").optional().isString(),
    body("profile.phone").optional().isString(),
    body("profile.address").optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id
      const updates = req.body

      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" })
      }

      // Mettre à jour les champs
      for (const key in updates) {
        if (key === "password") {
          user.password = updates.password // Le pre-save hook hachera le nouveau mot de passe
        } else if (key === "profile") {
          user.profile = { ...user.profile, ...updates.profile }
        } else {
          user[key] = updates[key]
        }
      }

      await user.save()

      res.json({
        message: "Profil mis à jour avec succès",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile,
        },
      })
    } catch (error) {
      res.status(500).json({
        error: "Erreur serveur",
        message: error.message,
      })
    }
  },
)

router.post("validate", async (req, res) => {
  const {token} = req.body

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token invalide ou expiré" });
    }
    req.user = decoded; // Ajoute les données décodées au req
    next();
  });
})

module.exports = router
