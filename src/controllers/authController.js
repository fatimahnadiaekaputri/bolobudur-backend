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
      const result = await AuthService.getProfile(req.user.id);
      res.json(result);
    } catch (err) {
      res.status(404).json({ message: err.message });
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
        user: { id: decoded.id, email: decoded.email },
        message: "Token is valid"
      });
    } catch (err) {
      res.status(401).json({
        valid: false,
        message: "Invalid or expired token"
      });
    }
  },
};

module.exports = AuthController;
