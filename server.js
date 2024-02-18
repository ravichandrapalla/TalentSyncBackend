require("./dbconnection");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const db = require("./queries");
const authMiddleware = require("./authMiddleware");
const port = process.env.PORT || 3001;
const multer = require("multer");
const upload = multer();
// const HOST = "127.0.0.1";
require("dotenv").config();

// middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.post("/signup", db.createUser);
app.post("/login", db.getUser);

app.post("/refreshToken", authMiddleware.verifyRefresh, (req, res) => {
  const user = req.user;
  console.log("req.body is -> ", req);
  const newAccessToken = jwt.sign(user, process.env.SECRET_KEY, {});
  res.setHeader("Authorization", `Bearer ${newAccessToken}`);
  res.setHeader("Access-Control-Expose-Headers", "Authorization");
  res.status(200).json({ message: "Token Refresh Complete" });
});

app.post(
  "/uploadResume/:regId",
  authMiddleware.verifyToken,
  upload.single("resume"),
  db.storeResume
  // (req, res) => {
  //   const { regId } = req.params;
  //   const { file, user } = req;
  //   const {
  //     fieldname: mappedKey,
  //     originalname: fileName,
  //     buffer: actualFileContent,
  //     size: fileSize,
  //   } = file;
  //   console.log("userfiles ------>", req);
  //   console.log("resume ------>", file, regId);
  //   console.log(
  //     "destructured ---------> ",
  //     mappedKey,
  //     fileName,
  //     actualFileContent,
  //     fileSize
  //   );
  //   res.status(201).send("gone through");
  // }
);

app.get("/verify/:verificationToken", db.verifyEmail);

app.get("/getAllUsers", authMiddleware.verifyToken, db.getAllUsers);
app.get("/getCurrentUser", authMiddleware.verifyToken, (req, res) => {
  res.status(200).json({ message: "token is verified and looks good" });
});
app.get("/getJobMatches", authMiddleware.verifyToken, db.getJobMatches);
app.get("/getMatchedResumes", authMiddleware.verifyToken, db.getMatchedResumes);

app.get("/dashboard", authMiddleware.verifyToken, (req, res) => {
  res.json({ message: "You Landed on Dashboard" });
});

// app.post("/api/signup", async (req, res) => {
//   const { fullName, email, password } = req.body;
//   const responseData = {};
//   if (fullName && email && password) {
//     responseData.data = { fullName, email, password };
//     responseData.error = undefined;
//   } else {
//     responseData.data = undefined;
//     responseData.error = "error from backend";
//   }
//   res.json(responseData);
// });
// app.post("/api/login", async (req, res) => {
//   const { fullName, email, password } = req.body;
//   const responseData = {};
//   if (fullName && email && password) {
//     responseData.data = { fullName, email, password };
//     responseData.error = undefined;
//   } else {
//     responseData.data = undefined;
//     responseData.error = "error from backend";
//   }
//   res.json(responseData);
// });

app.listen(port, () => {
  console.log(`listening on port ${port}....`);
});
