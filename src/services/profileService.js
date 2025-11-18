const db = require('../config/db'); // MySQL / Postgre / Mongo sesuai proyekmu
const path = require('path');
const fs = require('fs');

exports.getProfile = async (userId) => {
    const [rows] = await db.query(
        "SELECT id, name, email, image FROM users WHERE id = ?",
        [userId]
    );

    if (!rows.length) throw new Error("User not found");

    const user = rows[0];
    user.imageUrl = user.image ? `/uploads/profile/${user.image}` : null;

    return user;
};

exports.updateProfile = async (userId, { name, email, image }) => {
    const [rows] = await db.query(
        "SELECT id, image FROM users WHERE id = ?",
        [userId]
    );

    if (!rows.length) throw new Error("User not found");

    const oldImage = rows[0].image;

    // Hapus foto lama jika ada foto baru
    if (image && oldImage) {
        const oldImagePath = path.join(__dirname, '../uploads/profile/', oldImage);
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
    }

    const updateQuery = `
        UPDATE users SET
        name = ?,
        email = ?,
        image = COALESCE(?, image)
        WHERE id = ?
    `;

    await db.query(updateQuery, [name, email, image, userId]);

    return {
        id: userId,
        name,
        email,
        imageUrl: image ? `/uploads/profile/${image}` : `/uploads/profile/${oldImage}`
    };
};
