const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const { verifyTokenMiddleware } = require("../middleware/authMiddleware");

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/profile", verifyTokenMiddleware, AuthController.profile);
router.post("/logout", verifyTokenMiddleware, AuthController.logout);
router.post("/validate", AuthController.validateToken);

module.exports = router;
