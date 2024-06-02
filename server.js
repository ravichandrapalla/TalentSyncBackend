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
app.post("/login", db.login);

app.post("/refreshToken", authMiddleware.verifyToken, db.tokenRefresh);

app.post(
  "/uploadResume/:regId",
  authMiddleware.verifyToken,
  upload.single("resume"),
  db.storeResume
);
app.put("/revokeAccess", authMiddleware.verifyToken, db.revokeAccess);

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
app.get("/getRecruiters", authMiddleware.verifyToken, db.getRecruiters);
app.get("/getClients", authMiddleware.verifyToken, db.getClients);
app.post("/approveUser", authMiddleware.verifyToken, db.approveUser);
app.post("/rejectUser", authMiddleware.verifyToken, db.rejectUser);
app.post("/editUser/:regId", authMiddleware.verifyToken, db.editUser);
app.get("/dashboard/:regId", authMiddleware.verifyToken, db.dashBoard);
app.post("/profile", authMiddleware.verifyToken, db.updateSelf);
app.get(
  "/getCurrentUserDetails",
  authMiddleware.verifyToken,
  db.getCurrUpdatedData
);
app.post(
  "/updateAvatarUrl",
  authMiddleware.verifyToken,
  db.updateUserAvatarUrl
);
app.post("/postJob", authMiddleware.verifyToken, db.postJob);
app.get("/getJobPostings", authMiddleware.verifyToken, db.getJobPostings);
app.post("/applyJobPosting", authMiddleware.verifyToken, db.applyJobPosting);
app.get(
  "/getJobApplications",
  authMiddleware.verifyToken,
  db.getJobApplications
);
app.get(
  "/getclientjobapplications",
  authMiddleware.verifyToken,
  db.getClientJobApplications
);
app.put(
  "/updateClientApplicationStatus",
  authMiddleware.verifyToken,
  db.updateStatusOfApplicant
);
app.get(
  "/getRecruiterJobApplications",
  authMiddleware.verifyToken,
  db.getJobApplicationsForRecruiter
);

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
