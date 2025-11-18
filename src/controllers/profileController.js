const profileService = require('../services/profileService');

exports.getProfile = async (req, res) => {
    try {
        const user = await profileService.getProfile(req.user.id);
        return res.json({
            status: true,
            message: "Profile fetched",
            data: user
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const image = req.file ? req.file.filename : null;

        const updatedUser = await profileService.updateProfile(req.user.id, {
            name,
            email,
            image
        });

        return res.json({
            status: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error) {
        return res.status(400).json({ status: false, message: error.message });
    }
};
