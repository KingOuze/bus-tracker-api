const User = require("../models/User");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passport = require('../config/passport');

// 🔹 Validation des données
const userSchema = Joi.object({
  firstName: Joi.string().max(50).required(),
  lastName: Joi.string().max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('simple','agent','admin','superAdmin','driver').required(),
  company: Joi.string().allow(null, ''), // facultatif si superAdmin
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow(null, ''),
  avatar: Joi.string().uri().allow(null, '')
});

class UserController {

  // 🔹 Créer un utilisateur
  static async createUser(req, res) {
  try {
    const data = req.body;

    // Validation avec Joi
    const { error, value } = userSchema.validate(data);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Vérifier si l'email existe déjà
    const exists = await User.findOne({ email: value.email });
    if (exists) return res.status(400).json({ message: "Email déjà utilisé" });

    // Vérifier si le numéro de téléphone existe déjà
    if (value.phone) {
      const existPhone = await User.findOne({ phone: value.phone });
      if (existPhone) return res.status(400).json({ message: "Numéro de téléphone déjà utilisé" });
    }

    // Si l'utilisateur n'est pas superAdmin, forcer company = celle du user connecté
    /*if (req.user.role !== 'superAdmin') {
      value.company = req.user.company;
    }*/

    const user = new User(value);
    await user.save();

    // Ne pas renvoyer le password
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({ message: "Utilisateur créé", user: userResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
}


  // 🔹 Liste des utilisateurs avec filtre par company
  static async getUsers(req, res) {
    try {
      const { page = 1, limit = 20, search = "" } = req.query;
      const query = {};

      if (req.user.role !== 'superAdmin') {
        query.company = req.user.company;
      }

      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

      const total = await User.countDocuments(query);

      res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }

  // 🔹 Obtenir un utilisateur par ID (uniquement company liée)
  static async getUserById(req, res) {
    try {
      const user = await User.findById(req.params.id);

      if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

      // Vérifier l'accès selon la company
      if (req.user.role !== 'superAdmin' && user.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({ message: "Accès refusé" });
      }

      res.json({ user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }

  // 🔹 Mettre à jour un utilisateur
  static async updateUser(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

      if (req.user.role !== 'superAdmin' && user.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({ message: "Accès refusé" });
      }

      const { firstName, lastName, phone, avatar, role } = req.body;

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone) user.phone = phone;
      if (avatar) user.avatar = avatar;
      if (role && req.user.role === 'superAdmin') user.role = role;

      await user.save();
      res.json({ message: "Utilisateur mis à jour", user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }

  // 🔹 Supprimer un utilisateur
  static async deleteUser(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

      if (req.user.role !== 'superAdmin' && user.company.toString() !== req.user.company.toString()) {
        return res.status(403).json({ message: "Accès refusé" });
      }

      await user.deleteOne();
      res.json({ message: "Utilisateur supprimé" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }

  // 🔹 Login
/*  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) return res.status(400).json({ message: "Email ou mot de passe incorrect" });
      if (user.status !== 'active') return res.status(403).json({ message: "Compte inactif ou suspendu" });

      const valid = await user.comparePassword(password);
      if (!valid) {
        await user.incLoginAttempts();
        return res.status(400).json({ message: "Email ou mot de passe incorrect" });
      }

      await user.resetLoginAttempts();

      const token = jwt.sign({ id: user.id, role: user.role, company: user.company }, process.env.JWT_SECRET, { expiresIn: '8h' });

      res.json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }*/


  static async login(req, res, next) {
    // Utiliser passport.authenticate comme middleware
    passport.authenticate('local', { session: false }, async (err, user, info) => {
      try {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Erreur serveur" });
        }
        
        if (!user) {
          return res.status(400).json({ message: info.message });
        }
        
        // Générer le token JWT
        const token = jwt.sign(
          { 
            id: user.id, 
            role: user.role, 
            company: user.company 
          }, 
          process.env.JWT_SECRET, 
          { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const userData = await user.withCompanyAndPermissions(); // Méthode personnalisée pour inclure company et permissions
        
        res.json({ 
          token, 
          user: userData
        });
        
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
      }
    })(req, res, next);
  }

  //refresh le token
  static async refreshToken(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(401).json({ message: "Token manquant" });
      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token invalide" });
        const newToken = jwt.sign({ id: user.id, role: user.role, company: user.company }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token: newToken });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
}

module.exports = UserController;
