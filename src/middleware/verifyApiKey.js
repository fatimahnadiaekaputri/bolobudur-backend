require('dotenv').config();

const verifyApiKey = (req, res, next) => {
    const key = req.headers.authorization?.split(' ')[1];

    if (!key) {
        return res.status(401).json({message: 'No API key provided'});
    }

    if (key !== process.env.API_KEY) {
        return res.status(403).json({message: 'Forbidden: Invalid API key'});
    }

    next();
}

module.exports = verifyApiKey;
