const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");
const { verifyTokenMiddleware } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { uploadImage, deleteImage } = require("../controllers/mediaController");

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/profile", verifyTokenMiddleware, AuthController.profile);
router.post("/logout", verifyTokenMiddleware, AuthController.logout);
router.post("/validate", AuthController.validateToken);
router.put("/change-password", verifyTokenMiddleware, AuthController.changePassword);
router.put("/profile", verifyTokenMiddleware, AuthController.updateProfile);
router.post('/image-profile', verifyTokenMiddleware, upload.single('image'), uploadImage);
router.delete("/image-profile", verifyTokenMiddleware, deleteImage)

module.exports = router;
