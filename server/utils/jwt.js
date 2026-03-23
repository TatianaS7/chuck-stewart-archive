const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    "change-this-jwt-secret"
  );
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    },
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
