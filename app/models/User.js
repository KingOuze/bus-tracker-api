const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez entrer un email valide']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['operator', 'admin', 'superAdmin', 'driver'],
    default: 'operator',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      // Company requis pour tous sauf superAdmin
      return this.role !== 'superAdmin';
    }
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Veuillez entrer un numéro de téléphone valide']
  },
  avatar: {
    data: Buffer,      // Stockage des données binaires
    contentType: String, // Type MIME de l'image (ex: 'image/png')
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  // Informations de connexion
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0,
    max: 5
  },
  lockUntil: Date,
  isFirstLogin: { type: Boolean, default: true },
  
  // Permissions spécifiques (optionnel)
  permissions: [{
    type: String,
    enum: [
      'view_buses', 'manage_buses',
      'view_lines', 'manage_lines', 
      'view_stops', 'manage_stops',
      'view_alerts', 'manage_alerts',
      'view_predictions', 'manage_predictions',
      'view_analytics', 'manage_analytics',
      'view_users', 'manage_users',
      'manage_company_settings'
    ]
  }],
  
  // Préférences utilisateur
  preferences: {
    language: {
      type: String,
      enum: ['fr', 'en', 'wo'], // français, anglais, wolof
      default: 'fr'
    },
    timezone: {
      type: String,
      default: 'Africa/Dakar'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      alerts: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Informations de vérification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  phoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Reset password
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Métadonnées
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      ret.fullName = `${ret.firstName} ${ret.lastName}`;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.resetPasswordToken;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Index pour les requêtes fréquentes
userSchema.index({ role: 1, company: 1 });
userSchema.index({ company: 1, status: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ emailVerificationToken: 1 });

// Propriété virtuelle pour vérifier si le compte est verrouillé
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware pour hasher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  // Ne hasher que si le mot de passe a été modifié
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour incrémenter les tentatives de connexion
userSchema.methods.incLoginAttempts = function() {
  // Si nous avons une date de verrouillage précédente et qu'elle est expirée, redémarrer à 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Verrouiller le compte après 5 tentatives pour 2 heures
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 heures
  }
  
  return this.updateOne(updates);
};

// Méthode pour réinitialiser les tentatives de connexion
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Méthode pour obtenir les permissions par défaut selon le rôle
userSchema.methods.getDefaultPermissions = function() {
  const rolePermissions = {
    simple: ['view_buses', 'view_lines', 'view_stops'],
    agent: [
      'view_buses', 'manage_buses',
      'view_lines', 'manage_lines',
      'view_stops', 'manage_stops',
      'view_alerts', 'manage_alerts',
      'view_predictions'
    ],
    admin: [
      'view_buses', 'manage_buses',
      'view_lines', 'manage_lines',
      'view_stops', 'manage_stops',
      'view_alerts', 'manage_alerts',
      'view_predictions', 'manage_predictions',
      'view_analytics', 'manage_analytics',
      'view_users', 'manage_users',
      'manage_company_settings'
    ],
    superAdmin: [
      'view_buses', 'manage_buses',
      'view_lines', 'manage_lines',
      'view_stops', 'manage_stops',
      'view_alerts', 'manage_alerts',
      'view_predictions', 'manage_predictions',
      'view_analytics', 'manage_analytics',
      'view_users', 'manage_users',
      'manage_company_settings'
    ]
  };
  
  return rolePermissions[this.role] || rolePermissions.simple;
};

// Méthode pour vérifier une permission
userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || 
         this.getDefaultPermissions().includes(permission);
};

// Méthode d’instance pour retourner user enrichi
userSchema.methods.withCompanyAndPermissions = async function () {
  const populatedUser = await this.populate("company");

  return {
    id: populatedUser._id,
    firstName: populatedUser.firstName,
    lastName: populatedUser.lastName,
    email: populatedUser.email,
    role: populatedUser.role,
    company: populatedUser.company,
    // combine les permissions personnalisées + par défaut
    permissions: [
      ...new Set([
        ...(populatedUser.permissions || []),
        ...populatedUser.getDefaultPermissions()
      ])
    ]
  };
};



module.exports = mongoose.model('User', userSchema);
