const express = require("express");
const router = express.Router();
const UserController = require("../controllers/userController");
const {authenticateToken} = require("../middlewares/auth");
const { requireRole } = require("../middlewares/auth");

// Routes publiques
router.post("/login", UserController.login);
router.post("/refresh-token", UserController.refreshToken);
router.get("/verify-token", UserController.verifyToken)

// Routes protégées
//router.use(authenticateToken);

router.get("/users", authenticateToken, requireRole(['admin', 'superAdmin']), UserController.getUsers);
router.get("/users/:id", authenticateToken, requireRole(['admin', 'superAdmin']), UserController.getUserById);
router.post("/users", authenticateToken, requireRole(['admin', 'superAdmin']), UserController.createUser);
router.put("/users/:id",authenticateToken, requireRole(['admin', 'superAdmin']), UserController.updateUser);
router.delete("/users/:id",authenticateToken, requireRole(['admin', 'superAdmin']), UserController.deleteUser);

module.exports = router;
