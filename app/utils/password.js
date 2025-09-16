import crypto from "crypto"

/**
 * Génère un mot de passe aléatoire de 10 caractères.
 */
export function generateRandomPassword() {
  return crypto.randomBytes(5).toString('hex'); // Exemple : "a1b2c3d4e5"
}
