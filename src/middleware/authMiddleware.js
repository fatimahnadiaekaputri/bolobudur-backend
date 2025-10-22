const { verifyToken } = require("../utils/jwtUtils");
const AuthService = require("../services/authService");

async function verifyTokenMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(403).json({ message: "Token required" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });

    const valid = await AuthService.validateToken(token);
    if (!valid) return res.status(401).json({ message: "Token revoked or expired" });

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    res.status(500).json({ message: "Token validation failed" });
  }
}

module.exports = { verifyTokenMiddleware };
