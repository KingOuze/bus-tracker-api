const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 10
  },
  description: {
    type: String,
    maxlength: 500
  },
  logo: {
    type: String // URL du logo
  },
  
  // Informations de contact
  contact: {
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: {
        type: String,
        default: 'Senegal'
      }
    },
    website: String
  },
  
  // Configuration de la compagnie
  settings: {
    timezone: {
      type: String,
      default: 'Africa/Dakar'
    },
    currency: {
      type: String,
      default: 'XOF' // Franc CFA
    },
    language: {
      type: String,
      enum: ['fr', 'en', 'wo'],
      default: 'fr'
    },
    
    // Limites et quotas
    limits: {
      maxBuses: {
        type: Number,
        default: 100
      },
      maxLines: {
        type: Number,
        default: 50
      },
      maxUsers: {
        type: Number,
        default: 20
      },
      maxStops: {
        type: Number,
        default: 200
      }
    },
    
    // Fonctionnalités activées
    features: {
      realTimeTracking: {
        type: Boolean,
        default: true
      },
      predictiveAnalytics: {
        type: Boolean,
        default: false
      },
      alertSystem: {
        type: Boolean,
        default: true
      },
      multiLanguage: {
        type: Boolean,
        default: false
      }
    }
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'trial'],
    default: 'trial'
  },
  
  // Informations de facturation
  billing: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    subscriptionStart: Date,
    subscriptionEnd: Date,
    billingAddress: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: String
    }
  },
  
  // Métadonnées
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Statistiques
  stats: {
    totalBuses: {
      type: Number,
      default: 0
    },
    totalLines: {
      type: Number,
      default: 0
    },
    totalUsers: {
      type: Number,
      default: 0
    },
    totalStops: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes pour optimiser les requêtes
companySchema.index({ status: 1 });
companySchema.index({ name: 'text', description: 'text' });

// Middleware pour générer automatiquement le code de la compagnie
companySchema.pre('save', function(next) {
  if (!this.code && this.name) {
    // Générer un code basé sur le nom de la compagnie
    this.code = this.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6) + 
      Math.random().toString(36).substr(2, 4).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Company', companySchema);