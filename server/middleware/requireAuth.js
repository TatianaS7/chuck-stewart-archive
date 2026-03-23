const { verifyAuthToken } = require("../utils/jwt");

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function requireAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    const payload = verifyAuthToken(token);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired auth token" });
  }
}

module.exports = {
  requireAuth,
  extractBearerToken,
};
