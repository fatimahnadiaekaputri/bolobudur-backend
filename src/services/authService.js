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
      .select("uuid", "name", "email", "image_profile", "created_at") // Pastikan kolom image_url sesuai DB
      .where({ uuid: userId })
      .first();
    
    if (!user) throw new Error("User not found");
    
    // Format URL gambar jika ada
    user.imageUrl = user.image_profile 
        ? `/uploads/profile/${user.image_profile}` 
        : null;
    
    return user;
  }

  static async updateProfile(userId, name, email, newImageFilename) {
    // 1. Ambil data user lama untuk cek gambar lama
    const currentUser = await db("user").where({ uuid: userId }).first();
    if (!currentUser) throw new Error("User not found");

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // 2. Logika Ganti Gambar
    if (newImageFilename) {
        // Hapus gambar lama fisik jika ada dan bukan default
        const oldImage = currentUser.image_profile;
        if (currentUser.image_url) {
            const oldImagePath = path.join(__dirname, '../uploads/profile/', oldImage);
            if (fs.existsSync(oldImagePath)) {
                try {
                    fs.unlinkSync(oldImagePath);
                } catch (err) {
                    console.error("Gagal hapus gambar lama:", err);
                }
            }
        }
        // Set nama file baru ke DB
        updateData.image_profile = newImageFilename; // Simpan nama filenya saja
    }

    // 3. Update DB
    await db("user").where({ uuid: userId }).update(updateData);

    const finalImageName = newImageFilename || currentUser.image_profile;
    
    // 4. Kembalikan data terbaru
    return { 
        ...currentUser, 
        ...updateData, 
        imageUrl: finalImageName ? `/uploads/profile/${finalImageName}` : null
    };
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
