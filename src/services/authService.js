const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { generateToken } = require("../utils/jwtUtils");
const dayjs = require("dayjs");
const path = require('path');
const fs = require('fs');

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
    const token = generateToken({ uuid: user.uuid, email: user.email });

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
      .select("uuid", "name", "email", "image_profile", "created_at") 
      .where({ uuid: userId })
      .first();
    
    if (!user) throw new Error("User not found");
    
    // // Format URL gambar jika ada
    // user.imageUrl = user.image_profile 
    //     ? `/uploads/profile/${user.image_profile}` 
    //     : null;
    
    return user;
  }

  // update profile
  static async updateProfile(userId, data) {
    try {
      const [user] = await db("user")
        .where({uuid: userId})
        .update(data)
        .returning([
          "uuid",
          "name",
          "email",
          "image_profile",
          "updated_at",
        ]);

        if (!user) {
          throw new Error("User not found");
        }
        

      return user;
    } catch (err) {
      // PostgreSQL UNIQUE constraint
      if (err.code === "23505") {
        throw new AppError("Email already used", 409);
      }
      throw err;
    }
  }
  

  //find user by Id
  static async getUserById(userId) {
    return db("user").where({ uuid: userId }).first();
  }
  

  // find user by Email
  static async getUserEmail(email) {
    return db("user")
      .where({email})
      .first();
  }

  // CHANGE PASSWORD
  static async changePassword(userId, oldPassword, newPassword) {
    const user = await db("user").where({ uuid: userId }).first();
    if (!user) throw new Error("User not found");

    // 1. Cek password lama
    const valid = bcrypt.compareSync(oldPassword, user.hash_password);
    if (!valid) throw new Error("Old password is incorrect");

    // 2. Hash password baru
    const newHash = bcrypt.hashSync(newPassword, 8);

    // 3. Update database
    await db("user")
      .where({ uuid: userId })
      .update({
        hash_password: newHash,
        updated_at: db.fn.now()
      });

    // 4. Opsional tapi sangat aman → revoke semua token lama
    await db("token").where({ user_id: userId }).update({
      revoked: true,
      updated_at: db.fn.now()
    });

    return { message: "Password updated successfully" };
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
