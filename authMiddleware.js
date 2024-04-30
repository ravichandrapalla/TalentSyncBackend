const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY;
const refreshSecretKey = process.env.REFRESH_KEY;

const verifyToken = (request, response, next) => {
  const token = request.header("Authorization");
  const refreshToken = request.header("refreshtoken");
  if (!token) {
    return response.status(401).json({ message: "Unauthorized Access" });
  }
  const alwaysDecode = jwt.decode(token);
  console.log("always decode result -- -----> ", alwaysDecode);

  jwt.verify(token, secretKey, (err, decoded) => {
    console.log("token --->", token, "refreshToken is ---> ", refreshToken);
    if (err) {
      if (err.name === "TokenExpiredError") {
        if (!refreshToken) {
          return response.status(401).json({ message: err });
        } else {
          jwt.verify(refreshToken, refreshSecretKey, (refreshErr, decoded) => {
            if (refreshErr) {
              return response
                .status(401)
                .json({ message: "Invalid Refresh Token. Please Login again" });
            }
            // console.log("decoaded data in backend is ", decoded);
            request.user = decoded;
            request.searchText = request.query.searchText;
            next();
          });
        }
      } else {
        return response.status(404).json({ message: "Unexpected token error" });
      }
    } else {
      request.user = decoded;

      request.searchText = request.query.searchText;

      next();
    }
  });
};
// const verifyRefresh = (request, response, next) => {
//   const token = request.header("Authorization");
//   const refreshToken = request.body.refreshToken;
//   // console.log(
//   //   "refresh token is  ------> ",
//   //   request,
//   //   "--------->",
//   //   refreshToken
//   // );

//   if (!refreshToken) {
//     return response
//       .status(401)
//       .json({ message: "unable to find refresh token in request" });
//   }

//   jwt.verify(refreshToken, refreshSecretKey, (err, decoded) => {
//     if (err) {
//       return response
//         .status(401)
//         .json({ message: "Invalid Refresh Token Login again" });
//     }
//     // console.log("decoaded data in backend is ", decoded);
//     request.user = decoded;
//     next();
//   });
//   // response.status(200).json({ message: "good work" });
// };

module.exports = { verifyToken };
