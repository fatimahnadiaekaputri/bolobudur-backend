const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { generateToken } = require("../utils/jwtUtils");
const dayjs = require("dayjs");

class AuthService {
  // REGISTER
  static async register(name, email, password) {
    const existing = await db("user").where({ email }).first();
    if (existing) throw new Error("Email already registered");

    const hash = bcrypt.hashSync(password, 8);
    await db("user").insert({
      name,
      email,
      hash_password: hash,
    });

    return { message: "User registered successfully" };
  }

  // LOGIN
  static async login(email, password) {
    const user = await db("user").where({ email }).first();
    if (!user) throw new Error("User not found");

    const valid = bcrypt.compareSync(password, user.hash_password);
    if (!valid) throw new Error("Invalid password");

    // Generate JWT
    const token = generateToken({ id: user.uuid, email: user.email });

    // Hitung expiry
    const expiresAt = dayjs().add(30, "day").toISOString();

    // Simpan token ke tabel tokens
    await db("token").insert({
      token,
      user_id: user.uuid,
      expires_at: expiresAt,
      revoked: false,
    });

    return { token };
  }

  // GET PROFILE
  static async getProfile(userId) {
    const user = await db("user")
      .select("uuid", "name", "email", "created_at")
      .where({ uuid: userId })
      .first();
    if (!user) throw new Error("User not found");
    return user;
  }

  // LOGOUT
  static async logout(token) {
    await db("token").where({ token }).update({
      revoked: true,
      updated_at: db.fn.now(),
    });
  }

  // VALIDASI TOKEN DI DB
  static async validateToken(token) {
    const record = await db("token").where({ token }).first();
    if (!record) return false;
    if (record.revoked) return false;
    if (dayjs(record.expires_at).isBefore(dayjs())) return false;
    return true;
  }
}

module.exports = AuthService;
