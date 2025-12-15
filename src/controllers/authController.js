const jwt = require("jsonwebtoken");
const AuthService = require("../services/authService");

const AuthController = {
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const result = await AuthService.register(name, email, password);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ message: err.message });
    }
  },

  profile: async (req, res) => {
    try {
      const result = await AuthService.getProfile(req.user.uuid);
      res.json({ status: true, data: result });
    } catch (err) {
      res.status(404).json({ status: false, message: err.message });
    }
  },

  updateProfile: async(req, res) => {
    try {
      const userId = req.user.uuid;
      const {name, email, image_profile} = req.body;

      const user = await AuthService.getUserById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });


      const updateData = {};

      if (email && email !==user.email) {
        const existingEMail = await AuthService.getUserEmail(email);
        if (existingEMail && existingEMail.uuid !== userId) {
          return res.status(409).json({message: 'Email sudah digunakan'});
        }

        updateData.email = email;
      }

      if (name) updateData.name = name;

      if (image_profile) updateData.image_profile = image_profile;

      updateData.updated_at = new Date();

      const updated = await AuthService.updateProfile(userId, updateData)

      res.json({
        message: "User updated successfully",
        data: {
          name: updated.name,
          email: updated.email,
          image_profile: updated.image_profile,
          updated_at: updated.updated_at
        },
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

  logout: async (req, res) => {
    try {
      await AuthService.logout(req.token);
      res.json({ message: "Logout successful" });
    } catch (err) {
      res.status(500).json({ message: "Logout failed" });
    }
  },

  validateToken: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ valid: false, message: "No token provided" });
      }

      const token = authHeader.split(" ")[1]; // ambil setelah "Bearer "
      if (!token) {
        return res.status(401).json({ valid: false, message: "Invalid token format" });
      }

      // Verifikasi token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Jika valid, kembalikan data user (bisa email/id)
      res.status(200).json({
        valid: true,
        user: { uuid: decoded.uuid, email: decoded.email },
        message: "Token is valid"
      });
    } catch (err) {
      res.status(401).json({
        valid: false,
        message: "Invalid or expired token"
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const userId = req.user.uuid;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Both fields are required" });
      }

      const result = await AuthService.changePassword(
        userId,
        oldPassword,
        newPassword
      );

      res.json(result);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },

};

module.exports = AuthController;
