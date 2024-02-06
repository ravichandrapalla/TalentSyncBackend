const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY;

const verifyToken = (request, response, next) => {
  const token = request.header("Authorization").split(" ")[1];
  if (!token) {
    return response.status(401).json({ message: "Unauthorized Access" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return response
        .status(401)
        .json({ message: "Invalid Session please Login again" });
    }
    console.log("decoaded data in backend is ", decoded);
    request.user = decoded.username;
    next();
  });
};

module.exports = verifyToken;
