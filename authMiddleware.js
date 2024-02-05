const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY;

const verifyToken = (request, response, next) => {
  const token = request.header("Authorization");
  if (!token) {
    return response.status(401).json({ message: "Unauthorized Access" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return response.status(401).json({ message: "Invalid Data" });
    }
    request.user = decoded.user;
    next();
  });
};

module.exports = verifyToken;
