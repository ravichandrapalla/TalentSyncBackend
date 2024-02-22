const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY;
const refreshSecretKey = process.env.REFRESH_SECRET_KEY;

const verifyToken = (request, response, next) => {
  const token = request.header("Authorization");
  console.log("request header ius ------> ", request);
  if (!token) {
    return response.status(401).json({ message: "Unauthorized Access" });
  }
  console.log("token ---------------------> ", token);
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return response
        .status(401)
        .json({ message: "Invalid Session please Login again" });
    }
    console.log("decoaded data in backend is ---------------> ", decoded);
    request.user = decoded;
    request.searchText = request.query.searchText;
    console.log("search text is -----> ", request.query.searchText);
    next();
  });
};
const verifyRefresh = (request, response, next) => {
  const token = request.header("Authorization");
  const refreshToken = request.body.refreshToken;
  console.log(
    "refresh token is  ------> ",
    request,
    "--------->",
    refreshToken
  );

  if (!refreshToken) {
    return response
      .status(401)
      .json({ message: "unable to find refresh token in request" });
  }

  jwt.verify(refreshToken, refreshSecretKey, (err, decoded) => {
    if (err) {
      return response
        .status(401)
        .json({ message: "Invalid Refresh Token Login again" });
    }
    // console.log("decoaded data in backend is ", decoded);
    request.user = decoded;
    next();
  });
  // response.status(200).json({ message: "good work" });
};

module.exports = { verifyToken, verifyRefresh };
