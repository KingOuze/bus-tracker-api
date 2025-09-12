const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');


// Stratégie Local pour le login
passport.use('local', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return done(null, false, { message: "Email ou mot de passe incorrect" });
    }

    // Vérifier si le compte est verrouillé
    if (user.isLocked) {
      return done(null, false, { message: "Compte verrouillé temporairement. Réessayez plus tard." });
    }

    if (user.status !== 'active') {
      return done(null, false, { message: "Compte inactif ou suspendu." });
    }

    console.log("DB password hash:", user.password);
    console.log("Password input:", password);

    const valid = await user.comparePassword(password);
    console.log("Password valid:", valid);
    if (!valid) {
     // await user.incLoginAttempts(); // incrémenter les tentatives
      return done(null, false, { message: "Mot de passe incorrect" });
    }

    await user.resetLoginAttempts(); // réinitialiser après succès
    return done(null, user);

  } catch (error) {
    return done(error);
  }
}));


// Stratégie JWT pour protéger les routes
passport.use('jwt', new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.id);
    if (user && user.status === 'active') {
      return done(null, user);
    }
    return done(null, false, { message: "Utilisateur non trouvé ou inactif" });
  } catch (error) {
    return done(error);
  }
}));

module.exports = passport;